# Construtor de relatórios compartilháveis

## Objetivo
Após o login, transformar o painel atual numa área de construção de relatórios. O utilizador escolhe campanhas, anúncios, período, status e filtros; define quais métricas o cliente verá; pode ajustar manualmente cliques e investimento; e gera um link único sem expiração que continua editável.

## Fluxo
1. Manter o ecrã de login como bloqueio total para visitantes sem sessão.
2. Após o login, carregar os dados reais da Meta e mostrar o construtor no painel existente.
3. Permitir selecionar uma ou várias campanhas, anúncios específicos, período, status e os filtros atuais.
4. Calcular os totais da conta para o período com base nas campanhas selecionadas.
5. Permitir mostrar ou ocultar investimento e cliques.
6. Permitir substituir manualmente os valores exibidos de cliques e investimento, sem alterar os dados originais da Meta.
7. Criar um link único sem expiração, revogável e editável pelo proprietário.
8. Atualizações feitas no construtor serão refletidas no mesmo link.
9. O link público continuará a abrir diretamente em modo somente leitura, sem formulário de login.

## Persistência e segurança
- Ampliar o registo de relatórios compartilhados para guardar campanhas, anúncios, período, status, filtros, opções de visibilidade e ajustes manuais.
- Manter apenas o hash do token no banco; o token original aparece apenas no link entregue ao utilizador.
- Associar cada relatório ao utilizador autenticado e validar a propriedade em todas as edições e revogações.
- O acesso público recebe somente os dados e métricas autorizados na configuração salva.

## Interface
- Substituir o diálogo simples de compartilhamento por um construtor organizado em etapas curtas: conteúdo, métricas e link.
- Exibir os relatórios já criados com ações para editar, copiar e revogar.
- Preservar o visual atual, os cards, os filtros e o comportamento responsivo.

## Detalhes técnicos
- A função segura TanStack continuará a consultar a Meta com `META_ACCESS_TOKEN` apenas no servidor.
- A consulta aceitará intervalo de datas para os insights e normalizará cliques e investimento.
- As funções autenticadas criarão e atualizarão a configuração persistida; a função pública validará o token e aplicará todos os limites salvos no servidor.
- O relatório público aplicará as opções de visibilidade também nos cards, não apenas no resumo.
- Serão adicionados testes para criação, atualização pelo mesmo link, revogação, ocultação de métricas, filtros persistidos e bypass do login.
