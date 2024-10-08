import { onSignInUser } from "@/actions/auth"
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

const CompleteSigIn = async () => {
  const user = await currentUser()

  // If no user, redirect to sign-in
  if (!user) {
    return redirect("/sign-in")
  }

  // Sign in the user based on Clerk ID
  const authenticated = await onSignInUser(user.id)

  // Handle redirect based on the user's status
  if (authenticated.status === 200) {
    return redirect(`/group/create`) // New group creation
  } else if (authenticated.status === 207) {
    // Redirect to the group/channel they are a part of
    return redirect(
      `/group/${authenticated.groupId}/channel/${authenticated.channelId}`,
    )
  } else {
    // For any other status, redirect to sign-in
    return redirect("/sign-in")
  }
}

export default CompleteSigIn
