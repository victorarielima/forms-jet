import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import jetsalesLogo from "../assets/jetsales-logo.png";

const feedbackSchema = z.object({
  flowId: z.string().min(1, "ID do fluxo é obrigatório"),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FlowData {
  endpoint: string;
  method: string;
  flowName: string;
  flowId: string;
  nodeName: string;
  nodeId: string;
  rawUrl: string;
  formatted: string;
}

export default function FeedbackForm() {
  const { toast } = useToast();
  const [flowData, setFlowData] = useState<FlowData[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      flowId: "",
    },
  });

  const searchFlows = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const response = await fetch("https://n8n.jetsalesbrasil.com/webhook/5978ad8c-77c4-4e0c-a6a9-46ca24ab54c5", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flowId: data.flowId }),
      });

      if (!response.ok) {
        throw new Error("Erro ao buscar dados do fluxo");
      }

      const result = await response.json();
      return Array.isArray(result) ? result : [];
    },
    onSuccess: (data) => {
      setFlowData(data);
      setHasSearched(true);
      if (data.length === 0) {
        toast({
          title: "Nenhum resultado",
          description: "Nenhum dado encontrado para este ID de fluxo.",
          duration: 5000,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const sendDocumentation = useMutation({
    mutationFn: async () => {
      const selectedData = flowData
        .filter(item => selectedItems.has(item.nodeId))
        .map(item => item.formatted);

      const response = await fetch("https://n8n.jetsalesbrasil.com/webhook/e8f08853-b006-4d65-87b3-3554001d6e72", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoints: selectedData }),
      });

      if (!response.ok) {
        throw new Error("Erro ao enviar para documentação");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Endpoints enviados para documentação com sucesso!",
        duration: 5000,
      });
      setSelectedItems(new Set());
      setHasSearched(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const onSubmit = (data: FeedbackFormData) => {
    setSelectedItems(new Set());
    searchFlows.mutate(data);
  };

  const handleSelectItem = (nodeId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(nodeId)) {
      newSelected.delete(nodeId);
    } else {
      newSelected.add(nodeId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === flowData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(flowData.map(item => item.nodeId)));
    }
  };

  return (
    <>
      {/* Main Form Card */}
      <Card className="braseng-card animate-slide-up shadow-xl">
        <CardContent className="p-6">
          {/* Header with Logo */}
          <div className="text-center mb-6">
            <div className="inline-block">
              <img 
                src={jetsalesLogo} 
                alt="Jetsales Logo" 
                className="h-16 w-auto sm:h-20 md:h-24 object-contain cursor-pointer transition-transform duration-300 hover:scale-110" 
                style={{ imageRendering: 'auto', maxWidth: '100%' }}
              />
            </div>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Flow ID Field - Only show when not searched */}
              {!hasSearched && (
                <>
                  <FormField
                    control={form.control}
                    name="flowId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-[var(--color-label)]">
                          ID do fluxo
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="braseng-input form-input"
                            placeholder="Digite o ID do fluxo"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Search Button */}
                  <Button
                    type="submit"
                    className="braseng-button submit-btn"
                    disabled={searchFlows.isPending}
                  >
                    {searchFlows.isPending ? (
                      <span>Buscando...</span>
                    ) : (
                      "Buscar Fluxos"
                    )}
                  </Button>
                </>
              )}

              {/* Results Section */}
              {hasSearched && flowData.length > 0 && (
                <div className="pt-6 border-t border-[var(--color-input-border)]">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === flowData.length && flowData.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer accent-[var(--color-primary)]"
                    />
                    <h3 className="text-sm font-semibold text-[var(--color-header)]">
                      Endpoints disponíveis
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {flowData.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectItem(item.nodeId)}
                        className={`w-full p-4 rounded-lg text-left transition-all duration-200 border-2 flex items-start gap-3 ${
                          selectedItems.has(item.nodeId)
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                            : "border-[var(--color-input-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                        }`}
                      >
                        <div className="flex items-center mt-1 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.nodeId)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectItem(item.nodeId);
                            }}
                            className="w-4 h-4 cursor-pointer accent-[var(--color-primary)]"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-[var(--color-primary)] text-white text-xs font-bold rounded flex-shrink-0">
                                {item.method}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--color-header)] font-medium break-all">
                              {item.endpoint}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Submit Documentation Button */}
                  <div className="mt-6 pt-6 border-t border-[var(--color-input-border)]">
                    <Button
                      type="button"
                      onClick={() => sendDocumentation.mutate()}
                      disabled={selectedItems.size === 0 || sendDocumentation.isPending}
                      className="braseng-button submit-btn w-full"
                    >
                      {sendDocumentation.isPending ? (
                        <span>Enviando...</span>
                      ) : (
                        "Enviar para documentação"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}

