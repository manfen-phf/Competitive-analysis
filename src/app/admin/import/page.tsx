"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ImportSummary = {
  totalRows: number;
  insertedMerchants: number;
  updatedMerchants: number;
  insertedBds: number;
  updatedAssignments: number;
  cityCount: number;
  bdCount: number;
};

type MerchantItem = {
  cityName: string;
  merchantCode: string;
  merchantName: string;
  bdName: string;
  effectiveFrom: string;
};

type MerchantListResponse = {
  items?: MerchantItem[];
  filters?: { cities?: string[]; bds?: string[] };
  error?: string;
};

type Notice = { tone: "success" | "error" | "info"; message: string };

const today = () => new Date().toISOString().slice(0, 10);

export default function ImportPage() {
  const [passcode, setPasscode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [items, setItems] = useState<MerchantItem[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [bds, setBds] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [bd, setBd] = useState("");
  const [query, setQuery] = useState("");

  const loadMerchants = useCallback(async (filters: { city?: string; bd?: string; query?: string } = {}) => {
    setLoadingList(true);
    try {
      const search = new URLSearchParams();
      const next = filters;
      if (next.city) search.set("city", next.city);
      if (next.bd) search.set("bd", next.bd);
      if (next.query) search.set("query", next.query);
      const response = await fetch(`/api/admin/master-data?${search.toString()}`);
      const body = (await response.json()) as MerchantListResponse;
      if (!response.ok) throw new Error(body.error || "商家列表加载失败");
      setItems(body.items ?? []);
      setCities(body.filters?.cities ?? []);
      setBds(body.filters?.bds ?? []);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "商家列表加载失败" });
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadMerchants({});
  }, [loadMerchants]);

  async function post(form: FormData) {
    const response = await fetch("/api/admin/master-data", { method: "POST", body: form });
    const body = await response.json().catch(() => ({ error: `服务请求失败（${response.status}）` }));
    return { response, body };
  }

  async function verify() {
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("passcode", passcode);
      form.set("verifyOnly", "true");
      const { response, body } = await post(form);
      const valid = response.ok && Boolean(body.valid);
      setVerified(valid);
      setNotice({
        tone: valid ? "success" : "error",
        message: valid ? "管理员口令已验证，可以导入商家主数据。" : body.error || "管理员口令错误。",
      });
    } catch {
      setVerified(false);
      setNotice({ tone: "error", message: "口令校验请求失败，请稍后重试。" });
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    if (!file || !verified) return;
    setSubmitting(true);
    setNotice({ tone: "info", message: "正在校验 Excel 并同步商家主数据，请稍候…" });
    try {
      const form = new FormData();
      form.set("passcode", passcode);
      form.set("file", file);
      form.set("effectiveFrom", effectiveFrom);
      const { response, body } = await post(form);
      if (!response.ok) throw new Error(body.error || "导入失败");
      const nextSummary = body as ImportSummary;
      setSummary(nextSummary);
      setNotice({ tone: "success", message: `导入完成：已校验并同步 ${nextSummary.totalRows} 条商家记录。` });
      await loadMerchants({ city, bd, query });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "导入请求失败，请稍后重试。" });
    } finally {
      setSubmitting(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadMerchants({ city, bd, query });
  }

  return (
    <main className="master-data-page">
      <Link className="master-data-back" href="/">← 返回工作台</Link>
      <header className="master-data-heading">
        <div>
          <p>ADMIN · P0-1</p>
          <h1>商家主数据</h1>
          <span>导入城市、商家 ID、商家名称和负责 BD。系统会新增或同步变更，不删除历史商家记录。</span>
        </div>
        <div className="master-data-badge">仅支持 .xlsx / .xls</div>
      </header>

      <section className="master-data-import" aria-labelledby="import-title">
        <div className="master-data-section-heading">
          <div><p>01 · 数据导入</p><h2 id="import-title">导入每日商家数据源</h2></div>
          <span>四个必填字段缺失时，整份文件不会写入。</span>
        </div>
        <div className="master-data-form">
          <label>管理员口令
            <input type="password" autoComplete="new-password" value={passcode} onChange={(event) => { setPasscode(event.target.value); setVerified(false); }} placeholder="输入管理员口令" />
          </label>
          <button type="button" className="secondary" onClick={verify} disabled={!passcode || submitting}>{submitting ? "处理中…" : verified ? "已验证" : "验证口令"}</button>
          <label>数据生效日
            <input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
          </label>
          <label className="master-data-file">Excel 数据源
            <input type="file" accept=".xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <small>{file ? file.name : "请选择每日更新的商家数据文件"}</small>
          </label>
          <button type="button" className="primary" onClick={submit} disabled={!file || !verified || submitting}>{submitting ? "正在导入…" : "校验并导入"}</button>
        </div>
        {notice ? <p className={`master-data-notice ${notice.tone}`}>{notice.message}</p> : null}
      </section>

      {summary ? <section className="master-data-summary" aria-label="本次导入结果">
        <div><p>本次导入</p><strong>{summary.totalRows}</strong><span>商家记录</span></div>
        <div><p>新增商家</p><strong>{summary.insertedMerchants}</strong><span>已建立主数据</span></div>
        <div><p>更新归属</p><strong>{summary.updatedAssignments}</strong><span>BD 关系已同步</span></div>
        <div><p>覆盖范围</p><strong>{summary.cityCount} 城 / {summary.bdCount} BD</strong><span>本次文件内</span></div>
      </section> : null}

      <section className="master-data-list" aria-labelledby="merchant-list-title">
        <div className="master-data-section-heading">
          <div><p>02 · 当前主数据</p><h2 id="merchant-list-title">商家与 BD 归属</h2></div>
          <span>{loadingList ? "正在加载…" : `当前显示 ${items.length} 条记录`}</span>
        </div>
        <form className="master-data-filters" onSubmit={applyFilters}>
          <label>城市
            <select value={city} onChange={(event) => setCity(event.target.value)}><option value="">全部城市</option>{cities.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          </label>
          <label>负责BD
            <select value={bd} onChange={(event) => setBd(event.target.value)}><option value="">全部 BD</option>{bds.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          </label>
          <label className="master-data-search">搜索商家
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="商家 ID 或商家名称" />
          </label>
          <button className="secondary" type="submit" disabled={loadingList}>查询</button>
        </form>
        <div className="master-data-table-wrap">
          <table>
            <thead><tr><th>城市</th><th>商家 ID</th><th>商家名称</th><th>负责BD</th><th>关系生效日</th></tr></thead>
            <tbody>{items.length ? items.map((item) => <tr key={`${item.cityName}-${item.merchantCode}`}><td>{item.cityName}</td><td>{item.merchantCode}</td><td>{item.merchantName}</td><td>{item.bdName}</td><td>{item.effectiveFrom}</td></tr>) : <tr><td colSpan={5} className="master-data-empty">{loadingList ? "正在读取主数据…" : "暂无符合条件的商家记录"}</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
