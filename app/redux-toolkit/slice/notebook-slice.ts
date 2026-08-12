import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CounterState {
  data: Record<string, string>; //it is mapping with name id
}
//dont have idea
// no he click create notebook hjust open /dashboard/create-notebook/randomId
//but this randomId will come from backend when we create a notebook there
//wait lemme see you
// /yyeah
const initialState: CounterState = {
  data: {},
};

const counterSlice = createSlice({
  name: "counter",
  initialState,
  //wait a sec lemme read some docs
  reducers: {
    createNotebook: (
      state,
      action: PayloadAction<{ id: string; title: string }>
    ) => {
      const { id, title } = action.payload;
      state.data[id] = title;
    },
    deleteNotebook: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      delete state.data[id];
    },
    // ByAmount: (state, action: PayloadAction<{ id: string; title: string }>) => {
    //   const { id, title } = action.payload;
    //   state.data[id] = title;
    // },
  },
});

export const { createNotebook, deleteNotebook } = counterSlice.actions;

export default counterSlice.reducer;
