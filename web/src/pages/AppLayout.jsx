import { Navigate, Route, Routes } from "react-router-dom";
import { ChatProvider } from "@/contexts/ChatContext";
import { ResponsiveShell } from "@/components/layout/ResponsiveShell";
import Home from "./Home";
import Friends from "./Friends";
import ServerView from "./ServerView";
import InviteAccept from "./InviteAccept";
const AppLayout = () => (<ChatProvider>
    <ResponsiveShell>
      <Routes>
        <Route index element={<Home />}/>
        <Route path="friends" element={<Friends />}/>
        <Route path="dm/:dmId" element={<Home />}/>
        <Route path="invite/:code" element={<InviteAccept />}/>
        <Route path="server/:serverId" element={<ServerView />}/>
        <Route path="server/:serverId/:channelId" element={<ServerView />}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </ResponsiveShell>
  </ChatProvider>);
export default AppLayout;
