"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Check,
  ExternalLink,
  RefreshCw,
  Unplug,
  Loader2,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TrelloBoard {
  id: string;
  name: string;
}

interface TrelloList {
  id: string;
  name: string;
}

export function TrelloIntegrationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  // Fallback: read directly from store in case the subscription value is stale
  const getWsId = () => activeWorkspaceId || useAppStore.getState().activeWorkspaceId;
  const [step, setStep] = useState<"connect" | "configure" | "done">("connect");

  // Credentials
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);

  // Board & Lists
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [selectedBoardName, setSelectedBoardName] = useState("");
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);

  // Status mapping
  const [listMapping, setListMapping] = useState<Record<string, string>>({});
  const [memberMapping, setMemberMapping] = useState<Record<string, string>>({});
  const [trelloMembers, setTrelloMembers] = useState<{id:string, fullName:string}[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<{id:string, name:string}[]>([]);
  const statuses = ["todo", "in_progress", "review", "done"];

  // Portal container for Select dropdowns (nested inside Dialog portal
  // to avoid removeChild/insertBefore DOM errors with document.body)
  const [selectContainer, setSelectContainer] = useState<HTMLDivElement | null>(null);
  const selectContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setSelectContainer(node);
  }, []);

  // Existing config
  const [existingConfig, setExistingConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Create board
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);

  // Invite members
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviting, setInviting] = useState(false);

  // Load existing config on open
  useEffect(() => {
    if (open && getWsId()) {
      loadExistingConfig();
    }
  }, [open, activeWorkspaceId]);

  async function loadExistingConfig() {
    try {
      const res = await fetch(`/api/workspaces/${getWsId()}/trello`);
      const data = await res.json();
      if (data.configured !== false && data.id) {
        setExistingConfig(data);
        setSelectedBoardId(data.boardId);
        setSelectedBoardName(data.boardName || "");
        setListMapping(data.listMapping || {});
        setMemberMapping(data.memberMapping || {});
        setStep("configure");
        // Load boards list so user can change selection
        loadBoards();
        // Pre-load lists and members for the selected board
        loadLists(data.boardId);
        loadMembers(data.boardId);
      }
    } catch (err) {
      console.error("Failed to load Trello config:", err);
    }
  }

  async function testConnection() {
    if (!apiKey || !token) return;
    setTesting(true);
    try {
      const params = new URLSearchParams({ key: apiKey, token });
      const res = await fetch(`/api/trello/test?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
        setStep("configure");
      } else {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        alert("Connection failed: " + (err.error || "Invalid credentials"));
      }
    } catch {
      alert("Failed to reach Trello API. Please check your connection.");
    } finally {
      setTesting(false);
    }
  }

  async function loadBoards() {
    setLoadingBoards(true);
    try {
      const res = await fetch(
        `/api/workspaces/${getWsId()}/trello/boards`,
      );
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBoards(false);
    }
  }

  async function loadLists(boardId: string) {
    if (!boardId) return;
    setLoadingLists(true);
    try {
      const res = await fetch(
        `/api/workspaces/${getWsId()}/trello/lists?boardId=${boardId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setLists(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLists(false);
    }
  }

  async function loadMembers(boardId: string) {
    try {
      const res = await fetch(
        `/api/workspaces/${getWsId()}/trello/members?boardId=${boardId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setTrelloMembers(data);
      }
      // Also load workspace users
      const usersRes = await fetch(
        `/api/workspaces/${getWsId()}/members`,
      );
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setWorkspaceUsers(
          usersData.map((m: any) => ({
            id: m.userId,
            name: m.user?.name || m.userId,
          })),
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleBoardSelect(boardId: string) {
    setSelectedBoardId(boardId);
    const board = boards.find((b) => b.id === boardId);
    setSelectedBoardName(board?.name || "");
    await loadLists(boardId);
    await loadMembers(boardId);
  }

  function handleListMapChange(status: string, listId: string) {
    setListMapping((prev) => ({ ...prev, [status]: listId }));
  }

  async function createNewBoard() {
    if (!newBoardName.trim()) {
      alert("Please enter a board name");
      return;
    }
    setCreatingBoard(true);
    try {
      const res = await fetch(`/api/workspaces/${getWsId()}/trello/create-board`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBoardName,
          description: newBoardDesc,
          createDefaultLists: true,
          apiKey: apiKey || undefined,
          token: token || undefined,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Add the new board to the list
        setBoards((prev) => [{ id: data.board.id, name: data.board.name }, ...prev]);
        // Select it automatically
        setSelectedBoardId(data.board.id);
        setSelectedBoardName(data.board.name);
        // Set the lists
        setLists(data.lists);
        // Set the default mapping
        setListMapping(data.listMapping);
        // Reset form
        setNewBoardName("");
        setNewBoardDesc("");
        setShowCreateBoard(false);
        alert(`Board "${data.board.name}" created successfully!`);
      } else {
        const err = await res.json();
        alert("Failed to create board: " + (err.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      alert("Failed to create board");
    } finally {
      setCreatingBoard(false);
    }
  }

  async function inviteMemberToBoard() {
    if (!inviteEmail.trim()) {
      alert("Please enter an email address");
      return;
    }
    if (!selectedBoardId) {
      alert("Please select a board first");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch(`/api/workspaces/${getWsId()}/trello/invite-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteFullName || undefined,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Reload members
        await loadMembers(selectedBoardId);
        // Reset form
        setInviteEmail("");
        setInviteFullName("");
        alert(data.message || "Invitation sent!");
      } else {
        const err = await res.json();
        alert("Failed to invite member: " + (err.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      alert("Failed to invite member");
    } finally {
      setInviting(false);
    }
  }

  // Le mapping est: teamFlowUserId -> trelloMemberId
  // Quand un utilisateur TeamFlow est assigné à une tâche, son membre Trello correspondant sera assigné à la carte
  function handleMemberMapChange(teamFlowUserId: string, trelloMemberId: string) {
    setMemberMapping((prev) => ({ ...prev, [teamFlowUserId]: trelloMemberId }));
  }

  async function saveConfig() {
    if (!selectedBoardId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${getWsId()}/trello`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trelloApiKey: apiKey || "",
          trelloToken: token || "",
          boardId: selectedBoardId,
          boardName: selectedBoardName,
          listMapping,
          memberMapping,
          enabled: true,
          syncDirection: "bidirectional",
        }),
      });
      if (res.ok) {
        setStep("done");
      } else {
        const err = await res.json();
        alert("Save failed: " + (err.error || "Unknown error"));
      }
    } catch {
      alert("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(
        `/api/workspaces/${getWsId()}/trello/sync`,
        { method: "POST", body: JSON.stringify({ direction: "both" }) },
      );
      const data = await res.json();
      if (res.ok) {
        alert(
          `Sync completed! Push: ${data.results.push?.created || 0} created, ${data.results.push?.errors || 0} errors. Pull: ${data.results.pull?.synced || 0} synced, ${data.results.pull?.errors || 0} errors.`,
        );
      } else {
        alert("Sync failed: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (
      !confirm(
        "Disconnect Trello integration? This will not delete any Trello cards.",
      )
    )
      return;
    setDisconnecting(true);
    try {
      await fetch(`/api/workspaces/${getWsId()}/trello`, {
        method: "DELETE",
      });
      setExistingConfig(null);
      setStep("connect");
      setApiKey("");
      setToken("");
      setSelectedBoardId("");
      setSelectedBoardName("");
      setLists([]);
      setListMapping({});
      alert("Trello integration disconnected.");
    } catch {
      alert("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <div ref={selectContainerRef}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img
              src="/trello-logo.svg"
              alt="Trello"
              className="w-8 h-8 rounded-lg"
            />
            Trello Integration
          </DialogTitle>
          <DialogDescription>
            Connect your TeamFlow workspace to a Trello board for bidirectional
            task sync.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: API Credentials */}
        {step === "connect" && (
          <div className="space-y-4 py-4">
            {!existingConfig ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">Trello API Key</Label>
                  <Input
                    id="apiKey"
                    placeholder="Your Trello API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get it from{" "}
                    <a
                      href="https://trello.com/power-ups/admin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Trello Power-Up Admin
                    </a>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">Trello API Token</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="Your Trello token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Generate a token from your API Key page. Keep it secret.
                  </p>
                </div>
                <Button
                  onClick={testConnection}
                  disabled={!apiKey || !token || testing}
                  className="w-full bg-[#0079BF] hover:bg-[#026AA7] text-white"
                >
                  <span className="mr-2">
                    {testing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                  </span>
                  Test Connection
                </Button>
              </>
            ) : (
              <div className="text-center space-y-4">
                <Badge className="bg-emerald-500/10 text-emerald-700 border-0">
                  <Check className="h-3 w-3 mr-1" /> Connected to{" "}
                  {existingConfig.boardName || existingConfig.boardId}
                </Badge>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStep("configure");
                      loadBoards();
                    }}
                  >
                    Reconfigure
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    <span className="mr-1">
                      {disconnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unplug className="h-4 w-4" />
                      )}
                    </span>
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Board & List Mapping */}
        {step === "configure" && (
          <div className="space-y-4 py-4">
            <Tabs defaultValue="board" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="board">Board</TabsTrigger>
                <TabsTrigger value="mapping">Mapping</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>

              {/* Tab 1: Board Selection / Creation */}
              <TabsContent value="board" className="space-y-4 mt-4">
                {!showCreateBoard ? (
                  <>
                    {/* Board Selection */}
                    <div className="space-y-2">
                      <Label>Select Existing Board</Label>
                      {loadingBoards ? (
                        <div className="flex items-center justify-center py-3 border rounded-md">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Loading boards...</span>
                        </div>
                      ) : boards.length === 0 ? (
                        <div className="py-3 px-4 border rounded-md bg-muted/30">
                          <p className="text-sm text-muted-foreground text-center">
                            No boards available. Create a new board or click Refresh.
                          </p>
                        </div>
                      ) : (
                        <Select value={selectedBoardId} onValueChange={handleBoardSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a board..." />
                          </SelectTrigger>
                          <SelectContent container={selectContainer}>
                            {boards.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={loadBoards}
                          disabled={loadingBoards}
                        >
                          <RefreshCw
                            className={`h-3 w-3 mr-1 ${loadingBoards ? "animate-spin" : ""}`}
                          />
                          Refresh Boards
                        </Button>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or
                        </span>
                      </div>
                    </div>

                    {/* Create New Board Button */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowCreateBoard(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Board
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Create Board Form */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Create New Trello Board</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCreateBoard(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="boardName">Board Name *</Label>
                        <Input
                          id="boardName"
                          placeholder="My Project Board"
                          value={newBoardName}
                          onChange={(e) => setNewBoardName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="boardDesc">Description (optional)</Label>
                        <Input
                          id="boardDesc"
                          placeholder="Board description..."
                          value={newBoardDesc}
                          onChange={(e) => setNewBoardDesc(e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This will create a board with default lists: To Do, In Progress, Review, Done
                      </p>
                      <Button
                        onClick={createNewBoard}
                        disabled={!newBoardName.trim() || creatingBoard}
                        className="w-full bg-[#0079BF] hover:bg-[#026AA7] text-white"
                      >
                        {creatingBoard ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Create Board
                      </Button>
                    </div>
                  </>
                )}

                {selectedBoardId && (
                  <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <p className="text-sm text-emerald-700 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Selected: <strong>{selectedBoardName}</strong>
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Status -> List Mapping */}
              <TabsContent value="mapping" className="space-y-4 mt-4">
                {!selectedBoardId ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Please select or create a board first
                  </p>
                ) : loadingLists ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : lists.length > 0 ? (
                  <div className="space-y-3">
                    <Label>Status → Trello List Mapping</Label>
                    <p className="text-xs text-muted-foreground">
                      Map each TeamFlow status to a Trello list. Cards will be moved
                      automatically.
                    </p>
                    {statuses.map((status) => (
                      <div key={status} className="flex items-center gap-3">
                        <span className="w-28 text-sm font-medium capitalize">
                          {status.replace("_", " ")}
                        </span>
                        <Select
                          value={listMapping[status] || ""}
                          onValueChange={(v) => handleListMapChange(status, v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a list..." />
                          </SelectTrigger>
                          <SelectContent container={selectContainer}>
                            {lists.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No lists found on this board
                  </p>
                )}
              </TabsContent>

              {/* Tab 3: Member Management */}
              <TabsContent value="members" className="space-y-4 mt-4">
                {!selectedBoardId ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Please select or create a board first
                  </p>
                ) : (
                  <>
                    {/* Invite Member Form */}
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                      <Label className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Inviter un membre au board Trello
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Invitez des collaborateurs à rejoindre votre board Trello pour qu'ils puissent être assignés aux tâches.
                      </p>
                      <div className="space-y-2">
                        <Input
                          placeholder="Adresse email *"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                        <Input
                          placeholder="Nom complet (optionnel)"
                          value={inviteFullName}
                          onChange={(e) => setInviteFullName(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={inviteMemberToBoard}
                        disabled={!inviteEmail.trim() || inviting}
                        size="sm"
                        className="w-full"
                      >
                        {inviting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        Envoyer l'invitation
                      </Button>
                    </div>

                    {/* Member Mapping - TeamFlow User -> Trello Member */}
                    {workspaceUsers.length > 0 && (
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Mapper les utilisateurs TeamFlow aux membres Trello
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Quand vous assignez une tâche à un utilisateur TeamFlow, la carte Trello sera automatiquement assignée au membre Trello correspondant.
                        </p>
                        {workspaceUsers.map((wu) => (
                          <div key={wu.id} className="flex items-center gap-3">
                            <span className="w-32 text-sm truncate font-medium" title={wu.name}>
                              {wu.name}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <Select
                              value={memberMapping[wu.id] || ""}
                              onValueChange={(v) => handleMemberMapChange(wu.id, v)}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Sélectionner un membre Trello..." />
                              </SelectTrigger>
                              <SelectContent container={selectContainer}>
                                <SelectItem value="">-- Non mappé --</SelectItem>
                                {trelloMembers.map((tm) => (
                                  <SelectItem key={tm.id} value={tm.id}>
                                    {tm.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}

                    {trelloMembers.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Aucun membre sur ce board. Invitez quelqu'un ci-dessus !
                      </p>
                    )}

                    {workspaceUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Aucun utilisateur dans ce workspace.
                      </p>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setStep("connect")}>
                Back
              </Button>
              <Button
                onClick={saveConfig}
                disabled={!selectedBoardId || saving}
                className="flex-1 bg-[#0079BF] hover:bg-[#026AA7] text-white"
              >
                <span className="mr-2">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </span>
                Save Configuration
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Done / Sync */}
        {step === "done" && (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Integration Configured!</h3>
              <p className="text-sm text-muted-foreground">
                Tasks will now sync automatically between TeamFlow and Trello.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleSync} disabled={syncing}>
                <span className="mr-2">
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </span>
                Sync Now
              </Button>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
