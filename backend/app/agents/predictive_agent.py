"""Predictive Agent - RUL prediction, anomaly detection, early warning generation."""
import logging
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class AnomalyResult:
    is_anomaly: bool
    anomaly_score: float
    sensor_type: str
    value: float
    threshold_min: Optional[float]
    threshold_max: Optional[float]
    severity: str
    message: str


@dataclass
class RULResult:
    rul_days: Optional[float]
    confidence: float
    method: str
    degradation_rate: Optional[float]
    failure_probability_7d: float
    failure_probability_30d: float
    trend: str  # stable | degrading | improving


class PredictiveAgent:
    """
    Predictive maintenance agent for:
    - Anomaly detection on sensor streams
    - Remaining Useful Life (RUL) estimation
    - Early warning generation
    - Failure probability calculation
    """

    # Equipment-specific thresholds
    THRESHOLDS = {
        "vibration_mm_s": {
            "motor_small": {"warning": 1.8, "alarm": 4.5, "critical": 7.1},
            "motor_medium": {"warning": 2.8, "alarm": 7.1, "critical": 11.2},
            "motor_large": {"warning": 4.5, "alarm": 11.2, "critical": 18.0},
            "default": {"warning": 2.8, "alarm": 7.1, "critical": 11.2},
        },
        "temperature_c": {
            "motor": {"warning": 75, "alarm": 85, "critical": 95},
            "bearing": {"warning": 80, "alarm": 90, "critical": 100},
            "oil": {"warning": 65, "alarm": 75, "critical": 85},
            "default": {"warning": 75, "alarm": 85, "critical": 100},
        },
        "pressure_bar": {
            "hydraulic": {"warning_low": 150, "warning_high": 250, "alarm_low": 120, "alarm_high": 280},
            "default": {"warning_low": 0.5, "warning_high": 10, "alarm_low": 0.3, "alarm_high": 12},
        },
        "current_a": {
            "default": {"warning": 0.85, "alarm": 0.92, "critical": 1.0},  # as fraction of rated
        },
        "oil_level_pct": {
            "default": {"warning": 30, "alarm": 20, "critical": 10},
        },
        "cooling_water_flow_m3h": {
            "default": {"warning_low": 100, "alarm_low": 80, "critical_low": 60},
        },
    }

    def detect_anomalies(
        self,
        readings: List[Dict[str, Any]],
        equipment_type: str = "default",
    ) -> List[AnomalyResult]:
        """Detect anomalies in sensor readings using threshold + statistical methods."""
        results = []

        for reading in readings:
            sensor_type = reading.get("sensor_type", "")
            value = reading.get("value", 0)
            unit = reading.get("unit", "")
            t_min = reading.get("threshold_min")
            t_max = reading.get("threshold_max")

            # Get thresholds
            thresholds = self._get_thresholds(sensor_type, equipment_type)

            anomaly = False
            anomaly_score = 0.0
            severity = "normal"
            message = ""

            # Threshold-based detection
            if t_max is not None and value > t_max:
                anomaly = True
                anomaly_score = min(1.0, (value - t_max) / (t_max * 0.2 + 1e-6))
                severity = "warning" if anomaly_score < 0.5 else "alarm"
                message = f"{sensor_type} value {value:.2f} {unit} exceeds max threshold {t_max:.2f}"

            elif t_min is not None and value < t_min:
                anomaly = True
                anomaly_score = min(1.0, (t_min - value) / (t_min * 0.2 + 1e-6))
                severity = "warning"
                message = f"{sensor_type} value {value:.2f} {unit} below min threshold {t_min:.2f}"

            elif thresholds:
                # Use built-in thresholds
                anomaly, anomaly_score, severity, message = self._check_thresholds(
                    sensor_type, value, thresholds
                )

            results.append(AnomalyResult(
                is_anomaly=anomaly,
                anomaly_score=anomaly_score,
                sensor_type=sensor_type,
                value=value,
                threshold_min=t_min,
                threshold_max=t_max,
                severity=severity,
                message=message or f"{sensor_type}: {value:.2f} {unit} (normal)",
            ))

        return results

    def _get_thresholds(self, sensor_type: str, equipment_type: str) -> Optional[Dict]:
        """Look up thresholds for a sensor type."""
        sensor_map = {
            "vibration": "vibration_mm_s",
            "temperature": "temperature_c",
            "pressure": "pressure_bar",
            "current": "current_a",
            "oil_level": "oil_level_pct",
            "flow": "cooling_water_flow_m3h",
        }
        for key, mapped in sensor_map.items():
            if key in sensor_type.lower():
                sensor_thresholds = self.THRESHOLDS.get(mapped, {})
                return sensor_thresholds.get(equipment_type, sensor_thresholds.get("default"))
        return None

    def _check_thresholds(
        self, sensor_type: str, value: float, thresholds: Dict
    ) -> Tuple[bool, float, str, str]:
        """Check value against threshold levels."""
        if "critical" in thresholds and value >= thresholds["critical"]:
            score = min(1.0, (value - thresholds["critical"]) / (thresholds["critical"] * 0.1 + 1) + 0.8)
            return True, score, "critical", f"CRITICAL: {sensor_type} = {value:.2f} (threshold: {thresholds['critical']:.2f})"
        if "alarm" in thresholds and value >= thresholds["alarm"]:
            score = 0.6 + 0.2 * (value - thresholds["alarm"]) / (thresholds.get("critical", thresholds["alarm"] * 1.2) - thresholds["alarm"] + 1)
            return True, min(0.79, score), "alarm", f"ALARM: {sensor_type} = {value:.2f} (threshold: {thresholds['alarm']:.2f})"
        if "warning" in thresholds and value >= thresholds["warning"]:
            score = 0.3 + 0.3 * (value - thresholds["warning"]) / (thresholds.get("alarm", thresholds["warning"] * 1.2) - thresholds["warning"] + 1)
            return True, min(0.59, score), "warning", f"WARNING: {sensor_type} = {value:.2f} (threshold: {thresholds['warning']:.2f})"
        if "warning_low" in thresholds and value <= thresholds["warning_low"]:
            return True, 0.4, "warning", f"WARNING LOW: {sensor_type} = {value:.2f} (min threshold: {thresholds['warning_low']:.2f})"
        if "critical_low" in thresholds and value <= thresholds["critical_low"]:
            return True, 0.85, "critical", f"CRITICAL LOW: {sensor_type} = {value:.2f}"
        return False, 0.0, "normal", ""

    def estimate_rul(
        self,
        sensor_history: List[Dict[str, Any]],
        equipment_type: str = "default",
        failure_threshold: Optional[float] = None,
    ) -> RULResult:
        """Estimate Remaining Useful Life using degradation trend analysis."""

        if not sensor_history or len(sensor_history) < 3:
            return RULResult(
                rul_days=None,
                confidence=0.2,
                method="insufficient_data",
                degradation_rate=None,
                failure_probability_7d=0.1,
                failure_probability_30d=0.2,
                trend="unknown",
            )

        # Extract time series
        try:
            values = [float(r.get("value", 0)) for r in sensor_history]
            timestamps = []
            for r in sensor_history:
                ts = r.get("timestamp")
                if isinstance(ts, str):
                    timestamps.append(datetime.fromisoformat(ts.replace("Z", "+00:00")))
                elif isinstance(ts, datetime):
                    timestamps.append(ts)
                else:
                    timestamps.append(datetime.utcnow())

            # Calculate degradation rate (linear regression)
            n = len(values)
            if n < 2:
                raise ValueError("Insufficient data")

            # Normalize time to days
            t0 = timestamps[0]
            times_days = [(ts - t0).total_seconds() / 86400 for ts in timestamps]

            # Linear regression
            x = np.array(times_days)
            y = np.array(values)
            x_mean, y_mean = x.mean(), y.mean()
            
            if x.std() < 1e-10:
                slope = 0.0
            else:
                slope = np.sum((x - x_mean) * (y - y_mean)) / np.sum((x - x_mean) ** 2)

            # Determine trend
            trend = "stable"
            if slope > 0.05:
                trend = "degrading"
            elif slope < -0.05:
                trend = "improving"

            # Get threshold for this sensor
            current_value = values[-1]
            sensor_type = sensor_history[0].get("sensor_type", "vibration")
            thresholds = self._get_thresholds(sensor_type, equipment_type)

            if failure_threshold is None and thresholds:
                failure_threshold = thresholds.get("critical", thresholds.get("alarm"))

            # RUL calculation
            rul_days = None
            if failure_threshold and slope > 0 and current_value < failure_threshold:
                time_to_failure = (failure_threshold - current_value) / slope
                rul_days = max(0.0, time_to_failure)

            # Failure probabilities
            fp_7d = self._failure_probability(current_value, slope, 7, failure_threshold)
            fp_30d = self._failure_probability(current_value, slope, 30, failure_threshold)

            # Confidence based on R²
            y_pred = slope * x + (y_mean - slope * x_mean)
            ss_res = np.sum((y - y_pred) ** 2)
            ss_tot = np.sum((y - y_mean) ** 2)
            r_squared = 1 - ss_res / (ss_tot + 1e-10)
            confidence = max(0.2, min(0.95, r_squared))

            return RULResult(
                rul_days=round(rul_days, 1) if rul_days is not None else None,
                confidence=round(confidence, 2),
                method="linear_degradation",
                degradation_rate=round(slope, 4),
                failure_probability_7d=round(fp_7d, 3),
                failure_probability_30d=round(fp_30d, 3),
                trend=trend,
            )

        except Exception as e:
            logger.error(f"RUL estimation error: {e}")
            return RULResult(
                rul_days=None,
                confidence=0.15,
                method="error",
                degradation_rate=None,
                failure_probability_7d=0.15,
                failure_probability_30d=0.30,
                trend="unknown",
            )

    def _failure_probability(
        self,
        current: float,
        slope: float,
        days: int,
        threshold: Optional[float],
    ) -> float:
        """Estimate probability of failure within N days."""
        if threshold is None or slope <= 0:
            return max(0.05, min(0.3, slope * days * 0.1)) if slope > 0 else 0.05

        projected = current + slope * days
        if projected >= threshold:
            return min(0.95, 0.7 + 0.25 * (projected - threshold) / (threshold * 0.1 + 1))
        else:
            margin = (threshold - projected) / (threshold - current + 1e-6)
            return max(0.02, 0.3 * (1 - margin))

    def calculate_health_score(
        self,
        anomaly_results: List[AnomalyResult],
        rul_result: Optional[RULResult] = None,
        days_since_maintenance: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Calculate overall equipment health score (0-100)."""
        score = 100.0
        concerns = []

        # Deduct for anomalies
        severity_deductions = {"critical": 30, "alarm": 20, "warning": 10}
        for anomaly in anomaly_results:
            if anomaly.is_anomaly:
                deduction = severity_deductions.get(anomaly.severity, 5)
                score -= deduction
                concerns.append(anomaly.message)

        # Factor in RUL
        if rul_result and rul_result.rul_days is not None:
            if rul_result.rul_days < 7:
                score -= 25
                concerns.append(f"Critical: Only {rul_result.rul_days:.1f} days remaining useful life")
            elif rul_result.rul_days < 30:
                score -= 15
                concerns.append(f"Warning: {rul_result.rul_days:.1f} days remaining useful life")
            elif rul_result.trend == "degrading":
                score -= 5
                concerns.append("Degradation trend detected")

        # Factor in maintenance overdue
        if days_since_maintenance:
            if days_since_maintenance > 180:
                score -= 15
                concerns.append(f"Maintenance overdue by {days_since_maintenance - 90} days")
            elif days_since_maintenance > 90:
                score -= 8
                concerns.append(f"Maintenance due soon ({days_since_maintenance} days since last service)")

        score = max(0.0, min(100.0, score))

        # Determine risk level
        if score >= 80:
            risk_level = "low"
        elif score >= 60:
            risk_level = "medium"
        elif score >= 35:
            risk_level = "high"
        else:
            risk_level = "critical"

        return {
            "health_score": round(score, 1),
            "risk_level": risk_level,
            "key_concerns": concerns[:5],
            "trend": rul_result.trend if rul_result else "stable",
        }

    def generate_early_warnings(
        self,
        anomaly_results: List[AnomalyResult],
        rul_result: Optional[RULResult],
        equipment_name: str,
    ) -> List[Dict[str, Any]]:
        """Generate structured early warning alerts."""
        warnings = []

        for anomaly in anomaly_results:
            if not anomaly.is_anomaly:
                continue
            severity_map = {
                "critical": "critical",
                "alarm": "high",
                "warning": "medium",
            }
            warnings.append({
                "type": "sensor_anomaly",
                "severity": severity_map.get(anomaly.severity, "medium"),
                "title": f"{anomaly.severity.upper()}: {anomaly.sensor_type} abnormal on {equipment_name}",
                "description": anomaly.message,
                "sensor_type": anomaly.sensor_type,
                "value": anomaly.value,
                "anomaly_score": anomaly.anomaly_score,
            })

        if rul_result:
            if rul_result.rul_days is not None and rul_result.rul_days < 14:
                warnings.append({
                    "type": "rul_critical",
                    "severity": "critical" if rul_result.rul_days < 7 else "high",
                    "title": f"FAILURE RISK: {equipment_name} may fail in {rul_result.rul_days:.0f} days",
                    "description": f"RUL estimate: {rul_result.rul_days:.1f} days (confidence: {rul_result.confidence*100:.0f}%)",
                    "rul_days": rul_result.rul_days,
                    "confidence": rul_result.confidence,
                })
            if rul_result.failure_probability_7d > 0.5:
                warnings.append({
                    "type": "failure_prediction",
                    "severity": "high",
                    "title": f"HIGH FAILURE PROBABILITY: {equipment_name}",
                    "description": f"{rul_result.failure_probability_7d*100:.0f}% probability of failure within 7 days",
                    "probability_7d": rul_result.failure_probability_7d,
                    "probability_30d": rul_result.failure_probability_30d,
                })

        return warnings


# Singleton
predictive_agent = PredictiveAgent()
