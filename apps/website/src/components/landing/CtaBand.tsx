"use client";

import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CtaBand({ version }: { version: string }) {
  return (
    <section className="border-t border-vast-border py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-3xl px-4 text-center sm:px-6"
      >
        <h2 className="text-2xl font-semibold text-vast-fg sm:text-3xl">
          Ready to code on Windows?
        </h2>
        <p className="mt-3 text-vast-fg-muted">
          Download Vastoria v{version} for Windows x64. Setup installer
          recommended for Windows 11.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/downloads" size="lg">
            <Download className="h-4 w-4" />
            Get Vastoria
          </Button>
          <Button href="/changelog" variant="ghost" size="lg">
            View release notes
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
