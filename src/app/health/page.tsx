"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type Health={validCount:number;failedCount:number;duplicateCount:number;merchantCoverageRate:number};
export default function Health(){const [data,setData]=useState<Health>({validCount:0,failedCount:0,duplicateCount:0,merchantCoverageRate:0});useEffect(()=>{fetch("/api/health").then(r=>r.json()).then(setData)},[]);return <main><Link href="/">← 首页</Link><h1>上传统计</h1><p>仅成功识别、校验并去重后的截图进入竞争价格力看板。</p><div className="grid"><article><h3>有效截图</h3><b>{data.validCount}</b></article><article><h3>上传失败</h3><b>{data.failedCount}</b></article><article><h3>商家覆盖率</h3><b>{(data.merchantCoverageRate*100).toFixed(0)}%</b></article></div></main>}
