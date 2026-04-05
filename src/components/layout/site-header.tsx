"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "首页" },
  { href: "/funds", label: "基金搜索" },
  { href: "/recommendations", label: "基金推荐" },
  { href: "/portfolio", label: "持仓模拟" },
  { href: "/about", label: "关于与风险声明" }
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-brand" href="/">
          <div className="site-brand__mark">基研</div>
          <div>
            <p className="site-brand__title">基金买卖时机辅助决策平台</p>
            <p className="site-brand__subtitle">长期投资者的基金研究与决策辅助平台</p>
          </div>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
