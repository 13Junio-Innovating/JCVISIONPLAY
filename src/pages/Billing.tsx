import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, QrCode, Banknote, Check } from "lucide-react";
import { toast } from "sonner";

const plans = [
  {
    name: "Básico",
    price: "R$ 49,90",
    period: "/mês",
    description: "Ideal para pequenos negócios",
    features: [
      "Até 3 telas",
      "10 GB de armazenamento",
      "Suporte por email",
      "Estatísticas básicas",
    ],
  },
  {
    name: "Profissional",
    price: "R$ 149,90",
    period: "/mês",
    description: "Para empresas em crescimento",
    features: [
      "Até 10 telas",
      "50 GB de armazenamento",
      "Suporte prioritário",
      "Estatísticas avançadas",
      "Agendamento de conteúdo",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "R$ 399,90",
    period: "/mês",
    description: "Solução completa para grandes empresas",
    features: [
      "Telas ilimitadas",
      "200 GB de armazenamento",
      "Suporte 24/7",
      "API customizada",
      "Gerente de conta dedicado",
    ],
  },
];

const Billing = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | null>(null);

  const handleSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
    toast.info(`Plano ${planName} selecionado. Escolha a forma de pagamento.`);
  };

  const handlePayment = (method: "pix" | "card") => {
    if (!selectedPlan) {
      toast.error("Selecione um plano primeiro");
      return;
    }
    setPaymentMethod(method);
    // TODO: Integrar com gateway de pagamento
    toast.info(`Pagamento via ${method === "pix" ? "PIX" : "Cartão"} - Em desenvolvimento`);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Planos e Pagamento
          </h1>
          <p className="text-muted-foreground">
            Escolha o plano ideal para o seu negócio
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-glow ${
                selectedPlan === plan.name ? "ring-2 ring-primary" : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 right-6 bg-gradient-to-r from-primary to-accent">
                  Mais Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  onClick={() => handleSelectPlan(plan.name)}
                >
                  Selecionar Plano
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedPlan && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Escolha a forma de pagamento</CardTitle>
              <CardDescription>
                Plano selecionado: <strong>{selectedPlan}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary"
                  onClick={() => handlePayment("pix")}
                >
                  <QrCode className="w-8 h-8" />
                  <span>PIX</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary"
                  onClick={() => handlePayment("card")}
                >
                  <CreditCard className="w-8 h-8" />
                  <span>Cartão de Crédito</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary"
                  onClick={() => handlePayment("card")}
                >
                  <Banknote className="w-8 h-8" />
                  <span>Cartão de Débito</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Integração com gateway de pagamento em desenvolvimento
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Billing;
