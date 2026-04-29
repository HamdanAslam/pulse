class AppStore {
  servers = [];
  messages = [];
  dms = [];
  friends = [];
  users = [];
  selfId = "";

  listeners = new Set();

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    this.listeners.forEach((listener) => listener());
  }

  reset() {
    this.servers = [];
    this.messages = [];
    this.dms = [];
    this.friends = [];
    this.users = [];
    this.selfId = "";
    this.emit();
  }

  upsertUsers(users = []) {
    if (!users.length) return;
    const map = new Map(this.users.map((user) => [user.id, user]));
    users.forEach((user) => map.set(user.id, { ...map.get(user.id), ...user }));
    this.users = [...map.values()];
    this.emit();
  }
}

export const mockStore = new AppStore();
