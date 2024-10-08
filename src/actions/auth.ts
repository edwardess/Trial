"use server"

import { client } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

// Logs the current action and result for each function call
export const onAuthenticatedUser = async () => {
  console.log("onAuthenticatedUser: Initiating authentication flow...")
  try {
    const clerk = await currentUser()
    if (!clerk) {
      console.log("onAuthenticatedUser: No authenticated user found.")
      return { status: 404 }
    }

    console.log(
      `onAuthenticatedUser: Authenticated user found with Clerk ID: ${clerk.id}`,
    )

    const user = await client.user.findUnique({
      where: {
        clerkId: clerk.id,
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
      },
    })

    if (user) {
      console.log(
        `onAuthenticatedUser: User found in database with ID: ${user.id}`,
      )
      return {
        status: 200,
        id: user.id,
        image: clerk.imageUrl,
        username: `${user.firstname} ${user.lastname}`,
      }
    }

    console.log("onAuthenticatedUser: User not found in database.")
    return {
      status: 404,
    }
  } catch (error) {
    console.error(
      "onAuthenticatedUser: Error occurred during authentication:",
      error,
    )
    return {
      status: 400,
    }
  }
}

export const onSignUpUser = async (data: {
  firstname: string
  lastname: string
  image: string
  clerkId: string
}) => {
  console.log("onSignUpUser: Starting user sign-up process...")
  try {
    const createdUser = await client.user.create({
      data: {
        ...data,
      },
    })

    if (createdUser) {
      console.log(
        `onSignUpUser: User successfully created with ID: ${createdUser.id}`,
      )
      return {
        status: 200,
        message: "User successfully created",
        id: createdUser.id,
      }
    }

    console.log("onSignUpUser: Failed to create user in the database.")
    return {
      status: 400,
      message: "User could not be created! Try again",
    }
  } catch (error) {
    console.error("onSignUpUser: Error occurred during sign-up:", error)
    return {
      status: 400,
      message: "Oops! something went wrong. Try again",
    }
  }
}

export const onSignInUser = async (clerkId: string) => {
  console.log(
    `onSignInUser: Attempting to log in user with Clerk ID: ${clerkId}...`,
  )
  try {
    const loggedInUser = await client.user.findUnique({
      where: {
        clerkId,
      },
      select: {
        id: true,
        group: {
          select: {
            id: true,
            channel: {
              select: {
                id: true,
              },
              take: 1,
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    })

    if (loggedInUser) {
      console.log(`onSignInUser: User found with ID: ${loggedInUser.id}`)
      if (
        loggedInUser.group.length > 0 &&
        loggedInUser.group[0].channel.length > 0
      ) {
        console.log(
          `onSignInUser: User has groups and channels. Group ID: ${loggedInUser.group[0].id}, Channel ID: ${loggedInUser.group[0].channel[0].id}`,
        )
        return {
          status: 207,
          id: loggedInUser.id,
          groupId: loggedInUser.group[0].id,
          channelId: loggedInUser.group[0].channel[0].id,
        }
      }

      console.log(`onSignInUser: User logged in without group/channel.`)
      return {
        status: 200,
        message: "User successfully logged in",
        id: loggedInUser.id,
      }
    }

    console.log("onSignInUser: User not found in the database.")
    return {
      status: 400,
      message: "User could not be logged in! Try again",
    }
  } catch (error) {
    console.error("onSignInUser: Error occurred during login:", error)
    return {
      status: 400,
      message: "Oops! something went wrong. Try again",
    }
  }
}
