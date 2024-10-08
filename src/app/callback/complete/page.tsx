import { onSignUpUser } from "@/actions/auth"
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

const CompleteOAuthAfterCallback = async () => {
  const user = await currentUser()

  // If no user, redirect to sign-in and stop further execution
  if (!user) {
    return redirect("/sign-in")
  }

  // Attempt to sign up the user
  const complete = await onSignUpUser({
    firstname: user.firstName as string,
    lastname: user.lastName as string,
    image: user.imageUrl,
    clerkId: user.id,
  })

  // Redirect to the group creation page if signup is successful
  if (complete.status === 200) {
    return redirect(`/group/create`)
  }

  // Redirect to sign-in page if sign-up fails or has any other status
  return redirect("/sign-in")
}

export default CompleteOAuthAfterCallback
