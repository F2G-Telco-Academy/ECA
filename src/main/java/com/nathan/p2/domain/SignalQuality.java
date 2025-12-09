package com.nathan.p2.domain;

public enum SignalQuality {
    EXCELLENT(-80, Integer.MAX_VALUE, "#33FF57", "Excellent coverage and bitrates"),
    GOOD(-95, -80, "#3186cc", "Good signal strength"),
    FAIR(-110, -95, "#FF5733", "Moderate signal quality"),
    POOR(Integer.MIN_VALUE, -110, "#FF0000", "Poor signal quality (cell edges)");

    private final int minRsrp;
    private final int maxRsrp;
    private final String color;
    private final String description;

    SignalQuality(int minRsrp, int maxRsrp, String color, String description) {
        this.minRsrp = minRsrp;
        this.maxRsrp = maxRsrp;
        this.color = color;
        this.description = description;
    }

    public static SignalQuality classify(double rsrp) {
        if (rsrp >= -80) return EXCELLENT;
        if (rsrp >= -95) return GOOD;
        if (rsrp >= -110) return FAIR;
        return POOR;
    }

    public String getColor() { return color; }
    public String getDescription() { return description; }
    public int getMinRsrp() { return minRsrp; }
    public int getMaxRsrp() { return maxRsrp; }
}
