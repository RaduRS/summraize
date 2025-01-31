import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  return (
    <>
      <form className="w-full max-w-sm p-4">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-medium mb-2">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              className="text-primary font-medium underline"
              href="/sign-in"
            >
              Sign in
            </Link>
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input name="email" placeholder="you@example.com" required />
          </div>
          <SubmitButton formAction={forgotPasswordAction} className="w-full">
            Reset Password
          </SubmitButton>
          <FormMessage message={searchParams} />
        </div>
      </form>
    </>
  );
}
