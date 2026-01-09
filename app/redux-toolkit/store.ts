import { configureStore } from "@reduxjs/toolkit";
// import counterReducer from "../features/counter/counterSlice";
import notebookReducer from "./slice/notebook-slice";

export const store = configureStore({
  reducer: {
    notebook: notebookReducer,
  },
});

// 👇 types used across the app

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
