"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

interface FormState {
  name: string;
  slug: string;
  description: string;
  author: string;
  tags: string;
}

const EMPTY: FormState = { name: "", slug: "", description: "", author: "", tags: "" };

const inputClass =
  "w-full bg-lift border border-rule rounded-xl px-4 py-2.5 text-sm text-ink placeholder-faint focus:outline-none focus:border-ink/30 transition-colors";

function Field({
  label, htmlFor, hint, optional, children,
}: {
  label: string; htmlFor: string; hint?: React.ReactNode; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink flex items-center gap-2">
        {label}
        {optional && <span className="text-faint font-normal">optional</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-faint leading-relaxed">{hint}</p>}
    </div>
  );
}

export default function SubmitPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSlugSuggestion() {
    if (!form.name || form.slug) return;
    const suggested = form.name.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
    setForm((prev) => ({ ...prev, slug: suggested }));
  }

  function validate(): boolean {
    if (!form.name.trim()) { setError("Recipe name is required."); return false; }
    if (!form.slug.trim()) { setError("Slug is required."); return false; }
    if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      setError("Slug may only contain lowercase letters, numbers, and hyphens."); return false;
    }
    if (!form.description.trim()) { setError("Description is required."); return false; }
    return true;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setSubmitted(true);
    setForm(EMPTY);
  }

  const pokePreview = form.slug
    ? `https://poke.com/r/${form.slug.toLowerCase().replace(/\s+/g, "-")}`
    : "https://poke.com/r/your-slug";

  return (
    <>
      <Navbar />
      <main className="pt-14 min-h-screen">
        <div className="max-w-content mx-auto px-6 py-24">
          <Link href="/" className="text-xs text-faint hover:text-muted transition-colors inline-block mb-12">
            &larr; Back
          </Link>

          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-ink mb-2">Submit a recipe</h1>
          <p className="text-sm text-muted mb-12 leading-relaxed">
            Share a recipe that lives at{" "}
            <code className="font-mono text-xs bg-lift px-1.5 py-0.5 rounded">poke.com/r/&hellip;</code>
            {" "}so others can discover and add it in one click.
          </p>

          {submitted ? (
            <div className="border border-rule rounded-2xl p-10 text-center">
              <p className="text-sm font-medium text-ink mb-2">Recipe submitted.</p>
              <p className="text-sm text-muted mb-8">Thank you — it will appear after a quick review.</p>
              <button onClick={() => setSubmitted(false)}
                className="text-sm text-ink underline underline-offset-2 hover:text-muted transition-colors">
                Submit another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <Field label="Recipe name" htmlFor="name">
                <input id="name" name="name" type="text" value={form.name}
                  onChange={handleChange} onBlur={handleSlugSuggestion}
                  placeholder="Morning News Brief" className={inputClass} required />
              </Field>

              <Field label="Slug" htmlFor="slug"
                hint={<>URL-safe identifier &rarr; <a href={pokePreview} target="_blank" rel="noopener noreferrer"
                  className="underline underline-offset-2 text-ink">{pokePreview}</a></>}>
                <input id="slug" name="slug" type="text" value={form.slug}
                  onChange={handleChange} placeholder="morning-news-brief"
                  className={inputClass} required />
              </Field>

              <Field label="Description" htmlFor="description">
                <textarea id="description" name="description" value={form.description}
                  onChange={handleChange}
                  placeholder="What does this recipe do? Keep it to 1-2 sentences."
                  rows={3} className={inputClass + " resize-none"} required />
              </Field>

              <Field label="Your name or handle" htmlFor="author" optional>
                <input id="author" name="author" type="text" value={form.author}
                  onChange={handleChange} placeholder="amit" className={inputClass} />
              </Field>

              <Field label="Tags" htmlFor="tags" hint="Comma-separated, e.g. News, Daily, Productivity" optional>
                <input id="tags" name="tags" type="text" value={form.tags}
                  onChange={handleChange} placeholder="News, Daily" className={inputClass} />
              </Field>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button type="submit"
                className="w-full bg-ink text-white text-sm font-medium py-3 rounded-full hover:bg-muted transition-colors">
                Submit recipe
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
