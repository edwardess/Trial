import { onSignUpUser } from "@/actions/auth"
import { SignUpSchema } from "@/components/forms/sign-up/schema"
import { useSignIn, useSignUp } from "@clerk/nextjs"
import { OAuthStrategy } from "@clerk/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { SignInSchema } from "../../components/forms/sign-in/schema"

// Hook for handling Sign-In with Clerk
export const useAuthSignIn = () => {
  const { isLoaded, setActive, signIn } = useSignIn()
  const {
    register,
    formState: { errors },
    reset,
    handleSubmit,
  } = useForm<z.infer<typeof SignInSchema>>({
    resolver: zodResolver(SignInSchema),
    mode: "onBlur",
  })

  const router = useRouter()

  const onClerkAuth = async (email: string, password: string) => {
    if (!isLoaded) {
      return toast("Error", {
        description: "Clerk is not loaded. Please wait and try again.",
      })
    }

    try {
      const authenticated = await signIn.create({
        identifier: email,
        password: password,
      })

      if (authenticated.status === "complete") {
        reset()
        try {
          await setActive({ session: authenticated.createdSessionId })
          toast("Success", {
            description: "Welcome back!",
          })
          router.push("/callback/sign-in")
        } catch (error) {
          toast("Error", {
            description: "Failed to set the session. Please try again.",
          })
          console.error("Error setting session:", error)
        }
      }
    } catch (error: any) {
      if (error.errors[0].code === "form_password_incorrect") {
        toast("Error", {
          description: "email/password is incorrect, try again",
        })
      } else {
        console.error("Unknown error during authentication:", error)
        toast("Error", {
          description: "An unexpected error occurred. Please try again later.",
        })
      }
    }
  }

  const { mutate: InitiateLoginFlow, isPending } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      onClerkAuth(email, password),
  })

  const onAuthenticateUser = handleSubmit(async (values) => {
    InitiateLoginFlow({ email: values.email, password: values.password })
  })

  return {
    onAuthenticateUser,
    isPending,
    register,
    errors,
  }
}

// Hook for handling Sign-Up with Clerk, including verification code generation
export const useAuthSignUp = () => {
  const { setActive, isLoaded, signUp } = useSignUp()
  const [creating, setCreating] = useState<boolean>(false)
  const [verifying, setVerifying] = useState<boolean>(false)
  const [code, setCode] = useState<string>("")

  const {
    register,
    formState: { errors },
    reset,
    handleSubmit,
    getValues,
  } = useForm<z.infer<typeof SignUpSchema>>({
    resolver: zodResolver(SignUpSchema),
    mode: "onBlur",
  })

  const router = useRouter()

  const onGenerateCode = async (email: string, password: string) => {
    if (!isLoaded) {
      return toast("Error", {
        description: "Oops! something went wrong",
      })
    }
    try {
      if (email && password) {
        await signUp.create({
          emailAddress: getValues("email"),
          password: getValues("password"),
        })

        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        })

        setVerifying(true)
      } else {
        return toast("Error", {
          description: "No fields must be empty",
        })
      }
    } catch (error) {
      console.error(JSON.stringify(error, null, 2))
      toast("Error", {
        description: "Error occurred while generating code.",
      })
    }
  }

  const onInitiateUserRegistration = handleSubmit(async (values) => {
    if (!isLoaded) {
      return toast("Error", {
        description: "Oops! something went wrong",
      })
    }

    try {
      setCreating(true)
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      })

      if (completeSignUp.status !== "complete") {
        return toast("Error", {
          description: "Oops! something went wrong, status incomplete",
        })
      }

      if (completeSignUp.status === "complete") {
        if (!signUp.createdUserId) return

        const user = await onSignUpUser({
          firstname: values.firstname,
          lastname: values.lastname,
          clerkId: signUp.createdUserId,
          image: "",
        })

        reset()

        if (user.status === 200) {
          toast("Success", {
            description: user.message,
          })
          try {
            await setActive({
              session: completeSignUp.createdSessionId,
            })
            router.push(`/group/create`)
          } catch (error) {
            toast("Error", {
              description: "Failed to set the session.",
            })
            console.error("Session activation error:", error)
          }
        } else {
          toast("Error", {
            description: user.message + " action failed",
          })
          router.refresh()
        }
        setCreating(false)
        setVerifying(false)
      }
    } catch (error) {
      console.error(JSON.stringify(error, null, 2))
      toast("Error", {
        description: "An error occurred during sign-up.",
      })
    }
  })

  return {
    register,
    errors,
    onGenerateCode,
    onInitiateUserRegistration,
    verifying,
    creating,
    code,
    setCode,
    getValues,
  }
}

// Hook for handling Google OAuth with Clerk
export const useGoogleAuth = () => {
  const { signIn, isLoaded: LoadedSignIn } = useSignIn()
  const { signUp, isLoaded: LoadedSignUp } = useSignUp()

  const signInWith = (strategy: OAuthStrategy) => {
    if (!LoadedSignIn) return
    try {
      return signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/callback",
        redirectUrlComplete: "/callback/sign-in",
      })
    } catch (error) {
      console.error("Google Sign-in Error:", error)
      toast("Error", {
        description: "Google sign-in failed. Please try again.",
      })
    }
  }

  const signUpWith = (strategy: OAuthStrategy) => {
    if (!LoadedSignUp) return
    try {
      return signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/callback",
        redirectUrlComplete: "/callback/complete",
      })
    } catch (error) {
      console.error("Google Sign-up Error:", error)
      toast("Error", {
        description: "Google sign-up failed. Please try again.",
      })
    }
  }

  return { signUpWith, signInWith }
}
