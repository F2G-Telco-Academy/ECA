package com.nathan.p2.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CellInfo {
    private String mcc;
    private String mnc;
    private String lac;
    private String cid;
    private Integer pci;
    private Integer rsrp;
    private Integer rsrq;
    private Integer rssi;
    private String uarfcn;
    private String rat;
    private String operatorName;
}
