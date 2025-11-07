import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Message {
  sender: string;
  content: string;
  timestamp?: string;
}

interface RFPMessagePageProps {
  user: { id: string; role: string; token: string };
  rfpId: number;
  isAdmin: boolean;
}

const RFPMessagePage: React.FC<RFPMessagePageProps> = ({ user, rfpId, isAdmin }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch all messages for this RFP
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:8000/api/rfps/${rfpId}/messages`, {
          headers: { 'Authorization': `Bearer ${user.token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [rfpId, user.token]);

  // Send a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const endpoint = user.role === "admin"
        ? `http://localhost:8000/api/admin/rfps/message`
        : `http://localhost:8000/api/employee/rfps/message`;
      // Optionally log the message body before sending
      console.log(JSON.stringify({ content: newMessage }));
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ content: newMessage,id:rfpId })
      });
      if (!res.ok) throw new Error("Failed to send message");
      setSuccess("Message sent!");
      setNewMessage("");
      // Refresh messages
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Messages for RFP #{rfpId}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <Alert><AlertDescription>Loading...</AlertDescription></Alert>}
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <div className="text-gray-500">No messages yet.</div>
            ) : (
              messages.map((msg, idx) => {
                // If msg is an object with unknown keys (e.g., {admin: "hi"}), extract sender/content
                if (typeof msg === 'object' && msg !== null && !('sender' in msg) && !('content' in msg)) {
                  const msgObj = msg as Record<string, unknown>;
                  const sender = Object.keys(msgObj)[0] || 'Unknown';
                  const content = msgObj[sender];
                  return (
                    <div key={idx} className="p-3 rounded-lg bg-gray-100">
                      <div className="font-semibold text-blue-700">{sender}</div>
                      <div className="text-gray-800">{String(content)}</div>
                    </div>
                  );
                }
                // Otherwise, use the normal Message interface
                return (
                  <div key={idx} className="p-3 rounded-lg bg-gray-100">
                    <div className="font-semibold text-blue-700">{msg.sender || 'Unknown'}</div>
                    <div className="text-gray-800">{msg.content || JSON.stringify(msg)}</div>
                    {msg.timestamp && <div className="text-xs text-gray-400">{msg.timestamp}</div>}
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              required
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !newMessage}>Send</Button>
          </form>
          {success && <Alert className="mt-2"><AlertDescription>{success}</AlertDescription></Alert>}
        </CardContent>
      </Card>
    </div>
  );
};

export default RFPMessagePage;
