import AccountBookPage from "../shared";

export const metadata = { title: "Customer receivable" };
export const dynamic = "force-dynamic";

export default function ReceivablesPage() {
  return <AccountBookPage tab="receivables" />;
}
