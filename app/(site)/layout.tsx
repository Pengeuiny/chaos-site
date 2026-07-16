import Stage from "@/app/components/Stage";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Stage />
      <Header />
      <div id="view">{children}</div>
      <Footer />
    </>
  );
}
