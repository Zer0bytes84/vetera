import { motion } from "framer-motion";
import type React from "react";
import { Fragment } from "react";
import Logo from "./Logo";
import { CatSilhouette, DogSilhouette, PeekingCat, PeekingDog } from "./auth-peeking-pets";
import "./auth-clinic.css";

/** Left half of the first-run screens (login, activation): brand canvas,
 * bAItari wordmark, the screen's message and the rubrics at the bottom. */
export function AuthBrandPanel({ children, rubrics }: { children: React.ReactNode; rubrics: string[] }) {
  return (
    <section
      className="relative hidden min-h-screen flex-col justify-between border-white/50 border-r p-10 lg:flex xl:p-14 dark:border-white/[0.06]"
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return;
        const box = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--auth-light-x", `${event.clientX - box.left}px`);
        event.currentTarget.style.setProperty("--auth-light-y", `${event.clientY - box.top}px`);
      }}
    >
      <div aria-hidden="true" className="auth-brand-canvas">
        <div className="auth-brand-canvas__orb auth-brand-canvas__orb--blue" />
        <div className="auth-brand-canvas__orb auth-brand-canvas__orb--teal" />
        <div className="auth-brand-canvas__light" />
        <div className="auth-brand-canvas__grain" />
      </div>
      <div className="flex items-center justify-between">
        <div aria-label="bAItari" className="auth-wordmark" role="img">
          <Logo showWordmark={false} size="2xl" />
          <span aria-hidden="true">
            b<span className="auth-wordmark__ai">AI</span>tari
          </span>
        </div>
      </div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[620px]"
        initial={{ opacity: 0, y: 22 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
      <p aria-hidden="true" className="auth-clinic-rubrics">
        {rubrics.map((rubric, index) => (
          <Fragment key={rubric}>
            {index > 0 && <> <span>/</span> </>}
            {rubric}
          </Fragment>
        ))}
      </p>
    </section>
  );
}

/** Right half backdrop: dotted field and the two pets behind the glass card. */
export function AuthGlassBackdrop() {
  return (
    <div aria-hidden="true" className="auth-glass-backdrop">
      <DogSilhouette className="auth-glass-backdrop__shape auth-glass-backdrop__shape--dog" />
      <CatSilhouette className="auth-glass-backdrop__shape auth-glass-backdrop__shape--cat" />
      <PeekingDog className="auth-glass-backdrop__dog" />
      <PeekingCat className="auth-glass-backdrop__cat" />
    </div>
  );
}
