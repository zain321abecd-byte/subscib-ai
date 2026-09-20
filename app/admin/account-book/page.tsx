import AccountBookPage from "./shared";

export const metadata = { title: "Account book" };
export const dynamic = "force-dynamic";

export default function AccountBookIndex() {
  return <AccountBookPage tab="payables" />;
}
