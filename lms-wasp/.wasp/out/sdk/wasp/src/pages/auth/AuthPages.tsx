import React, { useState } from "react";
import {
  LoginForm,
  SignupForm,
  VerifyEmailForm,
  ForgotPasswordForm,
  ResetPasswordForm,
} from "wasp/client/auth";
import { Link } from "react-router";

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">V</span>
            </div>
            <span className="font-sora font-bold text-xl">Visionary Academy</span>
          </div>
          <p className="text-muted-foreground text-sm">Learn, grow, achieve.</p>
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-6">{children}</div>
      </div>
    </div>
  );
}

export function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
      <p className="mt-4 text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
      <p className="mt-2 text-sm text-center text-muted-foreground">
        <Link to="/request-password-reset" className="text-primary hover:underline">
          Forgot password?
        </Link>
      </p>
    </AuthLayout>
  );
}

export function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm
        additionalFields={[
          {
            name: "name",
            type: "input",
            label: "Full name",
            validations: {
              required: "Name is required",
            },
          },
          {
            name: "role",
            type: "input",
            label: "Role (STUDENT or TEACHER)",
            validations: {
              required: "Role is required",
              pattern: {
                value: /^(STUDENT|TEACHER)$/,
                message: "Must be STUDENT or TEACHER",
              },
            },
          },
        ]}
      />
      <p className="mt-4 text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:underline font-medium">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

export function EmailVerificationPage() {
  return (
    <AuthLayout>
      <VerifyEmailForm />
      <p className="mt-4 text-sm text-center text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}

export function RequestPasswordResetPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
      <p className="mt-4 text-sm text-center text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}

export function PasswordResetPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
