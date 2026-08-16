import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/blueprint/useInView";
import { FlowNode, type FlowNodeData } from "./FlowNode";
import { VConnector, BranchConnector } from "./Connectors";

interface BlueprintFlowProps {
  flowNodes: FlowNodeData[];
  branchNodes: FlowNodeData[];
  tailNodes: FlowNodeData[];
}

export function BlueprintFlow({ flowNodes, branchNodes, tailNodes }: BlueprintFlowProps) {
  const head = useInView<HTMLDivElement>({ threshold: 0.2 });
  const branch = useInView<HTMLDivElement>({ threshold: 0.3 });
  const tail = useInView<HTMLDivElement>({ threshold: 0.15 });

  return (
    <div className="flex flex-col items-center">
      {/* Head chain */}
      <div ref={head.ref} className="flex flex-col items-center">
        {flowNodes.map((node, i) => (
          <div key={node.id} className="flex flex-col items-center">
            {i > 0 && <VConnector active={head.inView} height={40} />}
            <div
              className={cn(head.inView ? "bp-rise" : "opacity-0")}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <FlowNode node={node} />
            </div>
          </div>
        ))}
      </div>

      {/* Branch split */}
      <div ref={branch.ref} className="w-full">
        <BranchConnector active={branch.inView} columns={3} />
        <div className="mt-2 grid gap-4 md:grid-cols-3">
          {branchNodes.map((node, i) => (
            <div
              key={node.id}
              className={cn(
                "flex justify-center",
                branch.inView ? "bp-rise" : "opacity-0",
              )}
              style={{ animationDelay: `${0.2 + i * 0.12}s` }}
            >
              <FlowNode node={node} className="w-full" compact />
            </div>
          ))}
        </div>
      </div>

      {/* Merge back + tail chain */}
      <div ref={tail.ref} className="flex flex-col items-center">
        <VConnector active={tail.inView} height={44} />
        {tailNodes.map((node, i) => (
          <div key={node.id} className="flex flex-col items-center">
            {i > 0 && <VConnector active={tail.inView} height={40} />}
            <div
              className={cn(tail.inView ? "bp-rise" : "opacity-0")}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <FlowNode node={node} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
