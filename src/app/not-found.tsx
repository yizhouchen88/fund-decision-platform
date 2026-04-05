import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="card">
        <div className="section-head">
          <div>
            <h1 style={{ margin: 0 }}>页面不存在</h1>
            <p>基金代码可能尚未同步，或者输入有误。你可以回到搜索页重新检索。</p>
          </div>
        </div>
        <Link className="button" href="/funds">
          返回基金搜索
        </Link>
      </section>
    </main>
  );
}
