import {
  BookOpen,
  Crown,
  Image,
  Map as MapIcon,
  MessageSquare,
  Network,
  Puzzle,
  ScrollText,
  Swords,
  UserRound,
  Users,
} from "lucide-react";
import { ActorsPanel } from "@/components/actors/ActorsPanel";
import { ScenesPanel } from "@/components/scene/ScenesPanel";
import { ChatPane } from "./ChatPane";
import { DmScreen } from "@/components/table/DmScreen";
import { TablePanel } from "@/components/table/TablePanel";
import { GraphPanel } from "@/components/graph/GraphView";
import { EmptyState } from "@/components/EmptyState";
import {
  BookArt,
  FrameArt,
  HoodArt,
  RuneArt,
  SwordsArt,
} from "@/components/illustrations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tip } from "@/components/ui/tooltip";
import { useLayout, type RightTab } from "@/stores/layout";
import { LorePanel } from "@/components/lore/LorePanel";
import { CombatPanel } from "@/components/sheet/CombatPanel";
import { ImagesPanel } from "@/components/images/ImagesPanel";
import { ExtensionsPanel } from "@/components/extensions/ExtensionsUi";
import { SheetPanel } from "@/components/sheet/SheetPanel";

const TABS: {
  id: RightTab;
  label: string;
  icon: React.ElementType;
  art: React.ReactNode;
  title: string;
  text: string;
}[] = [
  {
    id: "chat",
    label: "Chat",
    icon: MessageSquare,
    art: <RuneArt />,
    title: "Chat",
    text: "The session’s story and rolls.",
  },
  {
    id: "combat",
    label: "Combat",
    icon: Swords,
    art: <SwordsArt />,
    title: "No fight in progress",
    text: "Add tokens from the map, or /add Goblin hp 7 ac 15 init +2, then roll initiative.",
  },
  {
    id: "scenes",
    label: "Scenes",
    icon: MapIcon,
    art: <RuneArt />,
    title: "Scenes",
    text: "Battlemaps for this campaign.",
  },
  {
    id: "actors",
    label: "Actors",
    icon: UserRound,
    art: <HoodArt />,
    title: "Actors",
    text: "Characters and NPCs.",
  },
  {
    id: "sheet",
    label: "Sheet",
    icon: ScrollText,
    art: <HoodArt />,
    title: "No character selected",
    text: "The D&D sheet of the active character appears here and is saved to its note.",
  },
  {
    id: "lore",
    label: "Lore",
    icon: BookOpen,
    art: <BookArt />,
    title: "No lorebooks",
    text: "Lorebook entries triggered by the conversation will be listed here.",
  },
  {
    id: "images",
    label: "Images",
    icon: Image,
    art: <FrameArt />,
    title: "No images yet",
    text: "Generated portraits and scenes are saved to the campaign’s Images folder.",
  },
  {
    id: "graph",
    label: "Graph",
    icon: Network,
    art: <RuneArt />,
    title: "No notes yet",
    text: "Your notes and the links between them.",
  },
  {
    id: "table",
    label: "Table",
    icon: Users,
    art: <RuneArt />,
    title: "Play together",
    text: "Host the session for other players.",
  },
  {
    id: "dm",
    label: "DM screen",
    icon: Crown,
    art: <RuneArt />,
    title: "DM screen",
    text: "Private rolls and quick reference.",
  },
  {
    id: "extensions",
    label: "Extensions",
    icon: Puzzle,
    art: <RuneArt />,
    title: "No extensions enabled",
    text: "Extensions are off by default. Enable them in Settings to add panels here.",
  },
];

export function RightPanel(): React.JSX.Element {
  const { rightTab, setRightTab } = useLayout();
  return (
    <Tabs
      value={rightTab}
      onValueChange={(v) => setRightTab(v as RightTab)}
      className="@container flex h-full min-w-0 flex-col"
      aria-label="Side panels"
    >
      <div className="border-b p-2">
        <TabsList className="w-full">
          {TABS.map(({ id, label, icon: Icon }) => (
            <Tip key={id} label={label}>
              <TabsTrigger value={id} aria-label={label}>
                <Icon />
                <span className="hidden @min-[440px]:inline">{label}</span>
              </TabsTrigger>
            </Tip>
          ))}
        </TabsList>
      </div>
      {TABS.map((t) => (
        <TabsContent
          key={t.id}
          value={t.id}
          className={
            t.id === "chat"
              ? "flex min-h-0 flex-col"
              : "min-h-0 overflow-y-auto"
          }
        >
          {t.id === "chat" ? (
            <ChatPane />
          ) : t.id === "scenes" ? (
            <ScenesPanel />
          ) : t.id === "actors" ? (
            <ActorsPanel />
          ) : t.id === "lore" ? (
            <LorePanel />
          ) : t.id === "sheet" ? (
            <SheetPanel />
          ) : t.id === "combat" ? (
            <CombatPanel />
          ) : t.id === "images" ? (
            <ImagesPanel />
          ) : t.id === "graph" ? (
            <GraphPanel />
          ) : t.id === "table" ? (
            <TablePanel />
          ) : t.id === "dm" ? (
            <DmScreen />
          ) : t.id === "extensions" ? (
            <ExtensionsPanel />
          ) : (
            <EmptyState
              illustration={t.art}
              title={t.title}
              description={t.text}
              className="pt-16"
            />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
