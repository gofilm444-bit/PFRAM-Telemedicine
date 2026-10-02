const store = new Map();
export const getItemAsync = async (key) => store.get(key) ?? null;
export const setItemAsync = async (key, val) => {
  store.set(key, val);
};
export const deleteItemAsync = async (key) => {
  store.delete(key);
};
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 0;
export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
