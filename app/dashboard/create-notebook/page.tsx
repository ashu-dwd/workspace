"use client";

import { useAppDispatch } from "@/app/redux-toolkit/hooks";
import { createNotebook } from "@/app/redux-toolkit/slice/notebook-slice";

export default function CreateNotebook() {
  /// this is a page
  const dispatch = useAppDispatch();
  return (
    <div>
      <button
        onClick={() =>
          dispatch(createNotebook({ id: "1", title: "New Notebook" }))
        }
      >
        Create Notebook
      </button>
      Create Notebook Page
    </div>
  );
}
