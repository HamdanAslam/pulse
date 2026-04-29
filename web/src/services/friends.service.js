import { http } from "./http";
import { mockStore } from "./_mockStore";

export async function listFriends() {
  const friends = await http.get("/friends");
  mockStore.friends = friends;
  mockStore.emit();
  return friends;
}

export async function sendFriendRequest(username) {
  try {
    const result = await http.post("/friends/requests", { username });
    const existing = mockStore.friends.find((friend) => friend.userId === result.userId);
    mockStore.friends = existing
      ? mockStore.friends.map((friend) => (friend.userId === result.userId ? { ...friend, ...result } : friend))
      : [...mockStore.friends, result];
    mockStore.emit();
    return result;
  } catch {
    return null;
  }
}

export async function acceptFriend(userId) {
  await http.post(`/friends/${userId}/accept`);
  mockStore.friends = mockStore.friends.map((friend) =>
    friend.userId === userId ? { ...friend, status: "friend" } : friend,
  );
  mockStore.emit();
}

export async function declineFriend(userId) {
  await http.post(`/friends/${userId}/decline`);
  mockStore.friends = mockStore.friends.filter((friend) => friend.userId !== userId);
  mockStore.emit();
}

export async function removeFriend(userId) {
  await http.delete(`/friends/${userId}`);
  mockStore.friends = mockStore.friends.filter((friend) => friend.userId !== userId);
  mockStore.emit();
}
