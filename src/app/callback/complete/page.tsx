import { onSignUpUser } from "@/actions/auth"
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

const CompleteOAuthAfterCallback = async () => {
  const user = await currentUser()

  if (!user) {
    console.log("No authenticated user found, redirecting to sign-in.")
    return redirect("/sign-in")
  }

  const complete = await onSignUpUser({
    firstname: user.firstName as string,
    lastname: user.lastName as string,
    image: user.imageUrl,
    clerkId: user.id,
  })

  if (complete.status === 200) {
    console.log("User successfully signed up, redirecting to group creation.")
    return redirect(`/group/create`)
  } else {
    console.log("Sign-up failed, redirecting to sign-in.")
    return redirect("/sign-in")
  }
}

export default CompleteOAuthAfterCallback
