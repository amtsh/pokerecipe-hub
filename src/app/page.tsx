import Navbar     from "./components/Navbar";
import Hero       from "./components/Hero";
import RecipeGrid from "./components/RecipeGrid";
import Footer     from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="pt-14">
        <Hero />
        <RecipeGrid />
      </main>
      <Footer />
    </>
  );
}
