"use client";

import { motion } from "framer-motion";
import type { DocSection } from "@/lib/docs";

export function DocsContent({
  sections,
  title,
}: {
  sections: DocSection[];
  title: string;
}) {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-vast-fg">{title}</h1>
      <p className="mt-2 text-vast-fg-muted">
        Guides for installing and using Vastoria on Windows.
      </p>
      <div className="mt-12 space-y-14">
        {sections.map((section, i) => (
          <motion.section
            key={section.id}
            id={section.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="scroll-mt-24"
          >
            <h2 className="border-b border-vast-border pb-3 text-xl font-semibold text-vast-fg">
              {section.title}
            </h2>
            <div className="mt-4 space-y-3">
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm leading-relaxed text-vast-fg-muted"
                >
                  {paragraph}
                </p>
              ))}
              {section.code && (
                <pre className="overflow-x-auto rounded-lg border border-vast-border bg-vast-bg p-4 font-mono text-xs text-vast-fg">
                  <code>{section.code}</code>
                </pre>
              )}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
