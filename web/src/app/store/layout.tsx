import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export default function StoreLayout({ children }: LayoutProps<"/store">) {
  return <div className={`${inter.className} antialiased`}>{children}</div>;
}
