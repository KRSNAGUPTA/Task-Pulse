import {create} from "zustand"

interface IUser{
    id: string,
    email: string
}
interface IAuthStore{
    user: IUser | null,
    accessToken:string | null,
    isInitializing: boolean,
    setInitializing: (isInitializing: boolean)=>void,
    setAccessToken:(token: string)=> void,
    logout:()=>void
    setAuth: (user:IUser, accessToken:string)=>void
}


export const useAuthStore = create<IAuthStore>((set)=>({
    user: null,
    accessToken: null,
    isInitializing: false,
    setInitializing:(isInitializing)=> set({isInitializing}),
    setAccessToken: (token)=> set({accessToken: token}),
    logout: ()=>set({accessToken:null, user: null, isInitializing:false}),
    setAuth:(user, accessToken)=>set({
        user, accessToken
    })
}))

