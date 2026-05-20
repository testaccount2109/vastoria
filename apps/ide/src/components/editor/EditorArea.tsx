import { EditorGroupView } from "./EditorGroupView";
import { useEditorStore } from "@/stores/editorStore";

export function EditorArea() {
  const groups = useEditorStore((s) => s.groups);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden bg-vast-bg">
      {groups.map((group) => (
        <EditorGroupView
          key={group.id}
          group={group}
          isActiveGroup={group.id === activeGroupId}
        />
      ))}
    </div>
  );
}
