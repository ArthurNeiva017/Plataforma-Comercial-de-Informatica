// URL base da API Spring Boot. Todos os endpoints são construídos a partir daqui.
const API_BASE_URL = "http://localhost:8080/api";

// Arrays em memória que armazenam os dados enquanto o app está rodando.
// No modo online, eles são sincronizados com a API. No modo offline, servem como banco temporário.
let clientes = [];
let produtos = [];
let vendas = [];

// ──────────────────────────────────────────────
// Referências aos elementos HTML reutilizados ao longo do script
// ──────────────────────────────────────────────
const loginScreen = document.getElementById("login-screen");      // Tela de login/registro
const appScreen = document.getElementById("app-screen");           // Tela principal do sistema
const formLogin = document.getElementById("form-login");           // Formulário de login
const formRegistro = document.getElementById("form-registro");     // Formulário de cadastro de usuário
const loginErro = document.getElementById("login-erro");           // Span que exibe mensagens de erro
const loginCardTitle = document.getElementById("login-card-title"); // Título do card de login
const loginCardDesc = document.getElementById("login-card-desc");  // Subtítulo do card de login
const loginCredentials = document.getElementById("login-credentials"); // Bloco de credenciais (se existir)

// Links para alternar entre os formulários de Login e Registro
const linkIrRegistro = document.getElementById("link-ir-registro");
const linkIrLogin = document.getElementById("link-ir-login");

// Todas as seções do conteúdo principal (dashboard, clientes, produtos, vendas)
const sections = document.querySelectorAll(".section");
// Todos os botões de navegação da sidebar
const navButtons = document.querySelectorAll(".nav-btn");
// Título da página exibido no topo do conteúdo
const pageTitle = document.getElementById("page-title");

// ──────────────────────────────────────────────
// NAVEGAÇÃO ENTRE LOGIN E REGISTRO
// ──────────────────────────────────────────────

// Ao clicar em "Cadastre-se": esconde o form de login e exibe o de registro
linkIrRegistro.addEventListener("click", (event) => {
  event.preventDefault(); // Impede o comportamento padrão do link (navegar para "#")
  formLogin.classList.add("hidden");
  formRegistro.classList.remove("hidden");
  loginCardTitle.textContent = "Criar Nova Conta";
  loginCardDesc.textContent = "Preencha os campos para se cadastrar";
  loginCredentials.classList.add("hidden");
  loginErro.textContent = ""; // Limpa qualquer mensagem de erro anterior
});

// Ao clicar em "Entrar": esconde o form de registro e exibe o de login
linkIrLogin.addEventListener("click", (event) => {
  event.preventDefault();
  formRegistro.classList.add("hidden");
  formLogin.classList.remove("hidden");
  loginCardTitle.textContent = "Sistema de Gestão Comercial";
  loginCardDesc.textContent = "Acesse o painel administrativo";
  loginCredentials.classList.remove("hidden");
  loginErro.textContent = "";
});

// ──────────────────────────────────────────────
// REGISTRO DE NOVO USUÁRIO
// ──────────────────────────────────────────────

// Evento disparado ao enviar o formulário de registro
formRegistro.addEventListener("submit", async (event) => {
  event.preventDefault(); // Impede o recarregamento da página

  // Coleta os valores digitados pelo usuário
  const nome = document.getElementById("registro-nome").value;
  const email = document.getElementById("registro-usuario").value;
  const password = document.getElementById("registro-senha").value;

  try {
    // Envia os dados para o endpoint de registro da API Spring Boot
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: nome,
        email: email,
        password: password,
      }),
    });

    // 201 Created ou 200 OK indicam que o cadastro foi bem-sucedido
    if (response.status === 201 || response.status === 200) {
      alert("Usuário cadastrado com sucesso! Agora você pode fazer login.");
      formRegistro.reset(); // Limpa os campos do formulário
      // Volta para a tela de login após o cadastro
      formRegistro.classList.add("hidden");
      formLogin.classList.remove("hidden");
      loginCardTitle.textContent = "Sistema de Gestão Comercial";
      loginCardDesc.textContent = "Acesse o painel administrativo";
      loginCredentials.classList.remove("hidden");
      loginErro.textContent = "";
    } else if (response.status === 409) {
      // 409 Conflict: e-mail já cadastrado no sistema
      loginErro.textContent = "Erro: Este e-mail já está cadastrado.";
    } else {
      loginErro.textContent = "Erro ao registrar usuário. Tente novamente.";
    }
  } catch (e) {
    // Se a API estiver offline, simula um cadastro local para não travar o fluxo
    console.error("Erro ao conectar com API para registro:", e);
    alert("Modo offline: Usuário registrado localmente (simulado).");
    formRegistro.reset();
    formRegistro.classList.add("hidden");
    formLogin.classList.remove("hidden");
    loginCardTitle.textContent = "Sistema de Gestão Comercial";
    loginCardDesc.textContent = "Acesse o painel administrativo";
    loginCredentials.classList.remove("hidden");
    loginErro.textContent = "";
  }
});

// ──────────────────────────────────────────────
// LOGIN DO USUÁRIO
// ──────────────────────────────────────────────

// Evento disparado ao enviar o formulário de login
formLogin.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("login-usuario").value;
  const password = document.getElementById("login-senha").value;

  try {
    // Envia as credenciais para o endpoint de autenticação da API
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const token = data.token; // JWT retornado pela API

      // Salva o token no localStorage para ser usado em requisições futuras
      localStorage.setItem("token", token);

      loginErro.textContent = "";
      // Oculta a tela de login e exibe o painel principal
      loginScreen.classList.add("hidden");
      appScreen.classList.remove("hidden");
      
      // Carrega os dados do painel imediatamente após o login
      renderizarClientes();
      renderizarProdutos();
      renderizarVendas();
      atualizarDashboard();
      return;
    } else if (response.status === 401) {
      // 401 Unauthorized: credenciais inválidas
      loginErro.textContent = "Usuário ou senha inválidos.";
      return;
    } else {
      loginErro.textContent = "Erro ao tentar realizar login no servidor.";
      return;
    }
  } catch (e) {
    // A API não respondeu — tenta o modo offline
    console.error(
      "Erro de conexão com o servidor. Usando fallback offline...",
      e,
    );
  }

  // Fallback offline caso o servidor Spring Boot esteja desligado.
  // Permite acesso com credenciais fixas (admin / 1234) para testes locais.
  if (email === "admin" && password === "1234") {
    localStorage.setItem("token", "offline-token"); // Token especial que identifica o modo offline
    loginErro.textContent = "";
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    
    // Carrega os dados offline imediatamente
    renderizarClientes();
    renderizarProdutos();
    renderizarVendas();
    atualizarDashboard();
  } else {
    loginErro.textContent = "Usuário ou senha inválidos.";
  }
});

// ──────────────────────────────────────────────
// LOGOUT
// ──────────────────────────────────────────────

// Ao clicar em "Sair": remove o token e volta para a tela de login
document.getElementById("btn-sair").addEventListener("click", () => {
  localStorage.removeItem("token"); // Apaga o token de autenticação salvo
  appScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  formLogin.reset(); // Limpa os campos de e-mail e senha
});

// ──────────────────────────────────────────────
// NAVEGAÇÃO ENTRE SEÇÕES (Dashboard, Clientes, Produtos, Vendas)
// ──────────────────────────────────────────────

// Adiciona o evento de clique em cada botão da sidebar
navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const sectionName = button.dataset.section; // Nome da seção vem do atributo data-section do botão

    // Remove a classe "active" de todos os botões e a adiciona só no clicado
    navButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Esconde todas as seções de conteúdo e exibe apenas a correspondente ao botão
    sections.forEach((section) => section.classList.remove("active"));
    document.getElementById(sectionName).classList.add("active");

    // Atualiza o título da página no topo
    pageTitle.textContent = button.textContent;
  });
});

// ══════════════════════════════════════════════
// MÓDULO: CLIENTES
// ══════════════════════════════════════════════

// ──────────────────────────────────────────────
// SALVAR CLIENTE (Criar ou Editar)
// ──────────────────────────────────────────────

// Evento disparado ao submeter o formulário de cliente
document
  .getElementById("form-cliente")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    // O campo oculto "cliente-index" indica se estamos editando (tem valor) ou criando (vazio)
    const index = document.getElementById("cliente-index").value;

    // Coleta os dados do formulário em um objeto
    const cliente = {
      nome: document.getElementById("cliente-nome").value,
      email: document.getElementById("cliente-email").value,
      telefone: document.getElementById("cliente-telefone").value,
      endereco: document.getElementById("cliente-endereco").value,
      cpf: document.getElementById("cliente-cpf").value,
    };

    const token = localStorage.getItem("token");

    // ── Modo Online ──
    if (token && token !== "offline-token") {
      try {
        let response;
        if (index === "") {
          // Nenhum índice = novo cliente: usa POST para criar
          response = await fetch(`${API_BASE_URL}/clientes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`, // JWT enviado no header para autenticação
            },
            body: JSON.stringify(cliente),
          });
        } else {
          // Índice presente = edição: usa PATCH para atualizar o cliente pelo ID
          const id = clientes[index].id;
          response = await fetch(`${API_BASE_URL}/clientes/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(cliente),
          });
        }

        if (response.ok) {
          limparFormularioCliente(); // Reseta o formulário após salvar
          await renderizarClientes(); // Recarrega a lista atualizada da API
          atualizarDashboard(); // Atualiza os contadores do dashboard
        } else {
          alert("Erro ao salvar cliente no servidor.");
        }
      } catch (e) {
        console.error("Erro ao salvar cliente na API:", e);
        alert("Erro de conexão ao salvar cliente.");
      }
    } else {
      // ── Modo Offline: manipula o array local ──
      if (index === "") {
        clientes.push(cliente); // Adiciona novo cliente ao array
      } else {
        // Preserva o ID original se existir (importante para consistência)
        if (clientes[index] && clientes[index].id) {
          cliente.id = clientes[index].id;
        }
        clientes[index] = cliente; // Substitui o cliente no índice correto
      }

      limparFormularioCliente();
      renderizarClientes();
      atualizarDashboard();
    }
  });

// Botão "Cancelar" do formulário de cliente: limpa o form e volta ao modo de criação
document
  .getElementById("cancelar-cliente")
  .addEventListener("click", limparFormularioCliente);

// ──────────────────────────────────────────────
// EDITAR CLIENTE
// ──────────────────────────────────────────────

// Preenche o formulário com os dados do cliente escolhido para edição
function editarCliente(index) {
  const cliente = clientes[index]; // Busca o cliente pelo índice no array local

  // Preenche cada campo do formulário com os dados do cliente
  document.getElementById("cliente-index").value = index; // Guarda o índice para saber que é edição
  document.getElementById("cliente-nome").value = cliente.nome;
  document.getElementById("cliente-email").value = cliente.email;
  document.getElementById("cliente-telefone").value = cliente.telefone;
  document.getElementById("cliente-cpf").value = cliente.cpf;
  document.getElementById("cliente-endereco").value = cliente.endereco;

  // Altera o título e o botão para indicar modo de edição
  document.getElementById("titulo-form-cliente").textContent =
    "Alterar Cliente";
  document.getElementById("btn-cliente").textContent = "Salvar Alterações";
  document.getElementById("cancelar-cliente").classList.remove("hidden"); // Exibe o botão cancelar
}

// ──────────────────────────────────────────────
// LIMPAR FORMULÁRIO DE CLIENTE
// ──────────────────────────────────────────────

// Reseta o formulário para o estado inicial (modo de criação)
function limparFormularioCliente() {
  document.getElementById("form-cliente").reset(); // Limpa todos os campos
  document.getElementById("cliente-index").value = ""; // Remove o índice de edição
  document.getElementById("titulo-form-cliente").textContent =
    "Cadastrar Cliente";
  document.getElementById("btn-cliente").textContent = "Salvar Cliente";
  document.getElementById("cancelar-cliente").classList.add("hidden"); // Esconde o botão cancelar
}

// ──────────────────────────────────────────────
// RENDERIZAR CLIENTES (busca dados e exibe a tabela)
// ──────────────────────────────────────────────

async function renderizarClientes() {
  const tbody = document.getElementById("lista-clientes"); // Corpo da tabela de clientes
  const token = localStorage.getItem("token");

  // Se não há token, o usuário não está autenticado
  if (!token) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Usuário não autenticado. Faça login.</td></tr>`;
    return;
  }

  // Modo Offline (Fallback): usa o array local sem chamar a API
  if (token === "offline-token") {
    renderizarClientesLista(tbody);
    return;
  }

  // Modo Online: busca os dados na API
  try {
    const response = await fetch(`${API_BASE_URL}/clientes`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Sessão expirada ou token inválido.");
      }
      throw new Error(`Erro na API: Status ${response.status}`);
    }

    // Sobrescreve a variável global clientes para sincronizar com as ações de Alterar e Excluir
    clientes = await response.json();
    renderizarClientesLista(tbody); // Passa os dados para a função que monta o HTML
  } catch (erro) {
    console.error("Falha ao buscar clientes:", erro);
    tbody.innerHTML = `<tr><td colspan="4" class="empty error">Erro ao carregar os dados: ${erro.message}</td></tr>`;
  }
}

// ──────────────────────────────────────────────
// RENDERIZAR LISTA DE CLIENTES (monta o HTML da tabela)
// ──────────────────────────────────────────────

// Recebe o tbody e gera as linhas da tabela a partir do array "clientes"
function renderizarClientesLista(tbody) {
  if (!clientes || clientes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Nenhum cliente cadastrado.</td></tr>`;
    return;
  }

  // Usa map para transformar cada cliente em uma linha <tr> e join para unir tudo em uma string HTML
  tbody.innerHTML = clientes
    .map(
      (cliente, index) => `
    <tr>
      <td>${cliente.nome}</td>
      <td>${cliente.email}</td>
      <td>${cliente.telefone}</td>
      <td>${cliente.cpf}</td>
      <td>${cliente.endereco}</td>
      <td>
        <button class="btn-edit" onclick="editarCliente(${index})">Alterar</button>
        <button class="btn-danger" onclick="removerCliente(${index})">Excluir</button>
      </td>
    </tr>
  `,
    )
    .join("");
}

// ──────────────────────────────────────────────
// REMOVER CLIENTE
// ──────────────────────────────────────────────

async function removerCliente(index) {
  const token = localStorage.getItem("token");

  // ── Modo Online ──
  if (token && token !== "offline-token") {
    const id = clientes[index].id; // Obtém o ID real do cliente para enviar à API
    try {
      const response = await fetch(`${API_BASE_URL}/clientes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        limparFormularioCliente();
        await renderizarClientes(); // Recarrega a lista atualizada da API
        atualizarDashboard();
      } else {
        alert("Erro ao excluir cliente no servidor.");
      }
    } catch (e) {
      console.error("Erro ao excluir cliente na API:", e);
      alert("Erro de conexão ao excluir cliente.");
    }
  } else {
    // ── Modo Offline: apenas atualiza a tela (o array não é modificado diretamente aqui)
    limparFormularioCliente();
    renderizarClientes();
    atualizarDashboard();
  }
}

// ══════════════════════════════════════════════
// MÓDULO: PRODUTOS
// ══════════════════════════════════════════════

// PRODUTOS
// Evento disparado ao submeter o formulário de produto
document
  .getElementById("form-produto")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    // O campo oculto "produto-index" indica se é edição (tem valor) ou criação (vazio)
    const index = document.getElementById("produto-index").value;

    // Coleta os dados do formulário. Preço e estoque são convertidos para número.
    const produto = {
      nome: document.getElementById("produto-nome").value,
      preco: Number(document.getElementById("produto-preco").value),
      estoque: Number(document.getElementById("produto-estoque").value),
    };

    const token = localStorage.getItem("token");

    // ── Modo Online ──
    if (token && token !== "offline-token") {
      // A API usa "quantidade" no lugar de "estoque" para o campo de estoque
      const produtoDetails = {
        nome: produto.nome,
        preco: produto.preco,
        quantidade: produto.estoque, // Mapeamento: "estoque" do front → "quantidade" da API
      };

      try {
        let response;
        if (index === "") {
          // Novo produto: envia via POST
          response = await fetch(`${API_BASE_URL}/produtos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(produtoDetails),
          });
        } else {
          // Edição: envia via PUT com o ID do produto
          const id = produtos[index].id;
          response = await fetch(`${API_BASE_URL}/produtos/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(produtoDetails),
          });
        }

        if (response.ok) {
          limparFormularioProduto();
          await renderizarProdutos(); // Recarrega a lista atualizada
          atualizarDashboard();
        } else {
          alert("Erro ao salvar produto no servidor.");
        }
      } catch (e) {
        console.error("Erro ao salvar produto na API:", e);
        alert("Erro de conexão ao salvar produto.");
      }
    } else {
      // ── Modo Offline: manipula o array local ──
      if (index === "") {
        produtos.push(produto); // Adiciona novo produto ao array
      } else {
        // Preserva o ID original se existir
        if (produtos[index] && produtos[index].id) {
          produto.id = produtos[index].id;
        }
        produtos[index] = produto; // Substitui o produto no índice correto
      }

      limparFormularioProduto();
      renderizarProdutos();
      atualizarDashboard();
    }
  });

// Botão "Cancelar" do formulário de produto
document
  .getElementById("cancelar-produto")
  .addEventListener("click", limparFormularioProduto);

// ──────────────────────────────────────────────
// EDITAR PRODUTO
// ──────────────────────────────────────────────

// Preenche o formulário com os dados do produto selecionado para edição
function editarProduto(index) {
  const produto = produtos[index];

  document.getElementById("produto-index").value = index; // Guarda o índice para identificar edição
  document.getElementById("produto-nome").value = produto.nome;
  document.getElementById("produto-preco").value = produto.preco;
  document.getElementById("produto-estoque").value = produto.estoque;

  // Altera o título e o botão para indicar modo de edição
  document.getElementById("titulo-form-produto").textContent =
    "Alterar Produto";
  document.getElementById("btn-produto").textContent = "Salvar Alterações";
  document.getElementById("cancelar-produto").classList.remove("hidden");
}

// ──────────────────────────────────────────────
// LIMPAR FORMULÁRIO DE PRODUTO
// ──────────────────────────────────────────────

// Reseta o formulário para o estado inicial (modo de criação)
function limparFormularioProduto() {
  document.getElementById("form-produto").reset();
  document.getElementById("produto-index").value = "";
  document.getElementById("titulo-form-produto").textContent =
    "Cadastrar Produto";
  document.getElementById("btn-produto").textContent = "Salvar Produto";
  document.getElementById("cancelar-produto").classList.add("hidden");
}

// ──────────────────────────────────────────────
// RENDERIZAR PRODUTOS (busca dados e exibe a tabela)
// ──────────────────────────────────────────────

async function renderizarProdutos() {
  const tbody = document.getElementById("lista-produtos");
  const token = localStorage.getItem("token");

  if (!token) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Usuário não autenticado. Faça login.</td></tr>`;
    return;
  }

  // Modo Offline (Fallback)
  if (token === "offline-token") {
    renderizarProdutosLista(tbody);
    return;
  }

  // Modo Online
  try {
    const response = await fetch(`${API_BASE_URL}/produtos`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Sessão expirada ou token inválido.");
      }
      throw new Error(`Erro na API: Status ${response.status}`);
    }

    const data = await response.json();
    // Normaliza os dados da API para o formato esperado pelo front-end:
    // a API retorna "quantidade", mas o front usa "estoque"
    produtos = data.map((p) => ({
      id: p.id,
      nome: p.nome,
      preco: p.preco,
      estoque: p.quantidade, // Mapeamento inverso: "quantidade" da API → "estoque" do front
    }));
    renderizarProdutosLista(tbody);
  } catch (erro) {
    console.error("Falha ao buscar produtos:", erro);
    tbody.innerHTML = `<tr><td colspan="4" class="empty error">Erro ao carregar os dados: ${erro.message}</td></tr>`;
  }
}

// ──────────────────────────────────────────────
// RENDERIZAR LISTA DE PRODUTOS (monta o HTML da tabela)
// ──────────────────────────────────────────────

function renderizarProdutosLista(tbody) {
  if (!produtos || produtos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Nenhum produto cadastrado.</td></tr>`;
    return;
  }

  // Formata o preço com duas casas decimais (ex: R$ 19.90)
  tbody.innerHTML = produtos
    .map(
      (produto, index) => `
    <tr>
      <td>${produto.nome}</td>
      <td>R$ ${produto.preco.toFixed(2)}</td>
      <td>${produto.estoque}</td>
      <td>
        <button class="btn-edit" onclick="editarProduto(${index})">Alterar</button>
        <button class="btn-danger" onclick="removerProduto(${index})">Excluir</button>
      </td>
    </tr>
  `,
    )
    .join("");
}

// ──────────────────────────────────────────────
// REMOVER PRODUTO
// ──────────────────────────────────────────────

async function removerProduto(index) {
  const token = localStorage.getItem("token");

  // ── Modo Online ──
  if (token && token !== "offline-token") {
    const id = produtos[index].id;
    try {
      const response = await fetch(`${API_BASE_URL}/produtos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        produtos.splice(index, 1); // Remove o produto do array local após confirmação da API
        limparFormularioProduto();
        await renderizarProdutos();
        atualizarDashboard();
      } else {
        alert("Erro ao excluir produto no servidor.");
      }
    } catch (e) {
      console.error("Erro ao excluir produto na API:", e);
      alert("Erro de conexão ao excluir produto.");
    }
  } else {
    // ── Modo Offline: remove diretamente do array local ──
    produtos.splice(index, 1);
    limparFormularioProduto();
    renderizarProdutos();
    atualizarDashboard();
  }
}

// ══════════════════════════════════════════════
// MÓDULO: VENDAS
// ══════════════════════════════════════════════

// VENDAS
// Evento disparado ao submeter o formulário de venda
document
  .getElementById("form-venda")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    // O campo oculto "venda-index" indica se é edição ou criação
    const index = document.getElementById("venda-index").value;

    // Coleta os dados do formulário
    const venda = {
      cliente: document.getElementById("venda-cliente").value,
      produto: document.getElementById("venda-produto").value,
      quantidade: Number(document.getElementById("venda-quantidade").value),
    };

    const token = localStorage.getItem("token");

    // ── Modo Online ──
    if (token && token !== "offline-token") {
      // Encontra o cliente e o produto nas listas locais pelo nome (case-insensitive)
      const clienteObj = clientes.find(
        (c) => c.nome.toLowerCase() === venda.cliente.toLowerCase(),
      );
      const produtoObj = produtos.find(
        (p) => p.nome.toLowerCase() === venda.produto.toLowerCase(),
      );

      // Valida se o cliente digitado existe no sistema
      if (!clienteObj) {
        alert(
          "Cliente não encontrado no sistema. Cadastre-o na área de clientes.",
        );
        return;
      }
      // Valida se o produto digitado existe no sistema
      if (!produtoObj) {
        alert(
          "Produto não encontrado no sistema. Cadastre-o na área de produtos.",
        );
        return;
      }

      // Calcula o valor total da venda (preço unitário × quantidade)
      const valorTotal = produtoObj.preco * venda.quantidade;
      // Obtém a data atual no formato YYYY-MM-DD (compatível com a API)
      const dataVenda = new Date().toISOString().split("T")[0];

      try {
        let responseVenda;
        if (index === "") {
          // Criar venda
          // Passo 1: cria o registro principal da venda
          responseVenda = await fetch(`${API_BASE_URL}/vendas`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              data: dataVenda,
              valorTotal: valorTotal,
              cliente: { id: clienteObj.id }, // Referência ao cliente pelo ID
              usuario: { id: 1 }, // Usuário administrador padrão
            }),
          });

          if (responseVenda.ok) {
            const savedVenda = await responseVenda.json(); // Obtém o ID da venda criada

            // Criar item venda relacionado
            // Passo 2: cria o item da venda (produto + quantidade) vinculado à venda criada
            const responseItem = await fetch(`${API_BASE_URL}/itensvenda`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                venda: { id: savedVenda.id }, // Vincula o item à venda recém-criada
                produto: { id: produtoObj.id },
                quantidade: venda.quantidade,
                precoUnitario: produtoObj.preco,
              }),
            });

            if (responseItem.ok) {
              limparFormularioVenda();
              await renderizarVendas();
              atualizarDashboard();
            } else {
              alert("Erro ao registrar os itens da venda.");
            }
          } else {
            alert("Erro ao registrar a venda no servidor.");
          }
        } else {
          // Alterar venda
          // Obtém os IDs da venda e do item para atualizar os dois registros na API
          const idVenda = vendas[index].id;
          const idItem = vendas[index].itemId;

          // Passo 1: atualiza o registro principal da venda
          responseVenda = await fetch(`${API_BASE_URL}/vendas/${idVenda}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              data: dataVenda,
              valorTotal: valorTotal,
              cliente: { id: clienteObj.id },
              usuario: { id: 1 },
            }),
          });

          if (responseVenda.ok) {
            // Atualiza o item venda
            // Passo 2: atualiza o item vinculado à venda
            const responseItem = await fetch(
              `${API_BASE_URL}/itensvenda/${idItem}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  produto: { id: produtoObj.id },
                  quantidade: venda.quantidade,
                  precoUnitario: produtoObj.preco,
                  venda: { id: idVenda }, // Mantém o vínculo com a venda
                }),
              },
            );

            if (responseItem.ok) {
              limparFormularioVenda();
              await renderizarVendas();
              atualizarDashboard();
            } else {
              alert("Erro ao alterar os itens da venda.");
            }
          } else {
            alert("Erro ao alterar a venda no servidor.");
          }
        }
      } catch (e) {
        console.error("Erro ao processar venda na API:", e);
        alert("Erro de conexão ao salvar venda.");
      }
    } else {
      // ── Modo Offline: manipula o array local ──
      if (index === "") {
        vendas.push(venda); // Adiciona nova venda ao array
      } else {
        // Preserva os IDs originais para não quebrar referências
        if (vendas[index]) {
          venda.id = vendas[index].id;
          venda.itemId = vendas[index].itemId;
        }
        vendas[index] = venda; // Atualiza a venda no índice correto
      }

      limparFormularioVenda();
      renderizarVendas();
      atualizarDashboard();
    }
  });

// Botão "Cancelar" do formulário de venda
document
  .getElementById("cancelar-venda")
  .addEventListener("click", limparFormularioVenda);

// ──────────────────────────────────────────────
// EDITAR VENDA
// ──────────────────────────────────────────────

// Preenche o formulário com os dados da venda selecionada para edição
function editarVenda(index) {
  const venda = vendas[index];

  document.getElementById("venda-index").value = index; // Guarda o índice para identificar edição
  document.getElementById("venda-cliente").value = venda.cliente;
  document.getElementById("venda-produto").value = venda.produto;
  document.getElementById("venda-quantidade").value = venda.quantidade;

  // Altera o título e o botão para indicar modo de edição
  document.getElementById("titulo-form-venda").textContent = "Alterar Venda";
  document.getElementById("btn-venda").textContent = "Salvar Alterações";
  document.getElementById("cancelar-venda").classList.remove("hidden");
}

// ──────────────────────────────────────────────
// LIMPAR FORMULÁRIO DE VENDA
// ──────────────────────────────────────────────

// Reseta o formulário para o estado inicial (modo de registro)
function limparFormularioVenda() {
  document.getElementById("form-venda").reset();
  document.getElementById("venda-index").value = ""; // Remove o índice de edição
  document.getElementById("titulo-form-venda").textContent = "Registrar Venda";
  document.getElementById("btn-venda").textContent = "Registrar Venda";
  document.getElementById("cancelar-venda").classList.add("hidden");
}

// ──────────────────────────────────────────────
// RENDERIZAR VENDAS (busca dados e exibe a tabela)
// ──────────────────────────────────────────────

async function renderizarVendas() {
  const tbody = document.getElementById("lista-vendas");
  const token = localStorage.getItem("token");

  if (!token) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Usuário não autenticado. Faça login.</td></tr>`;
    return;
  }

  // Modo Offline (Fallback)
  if (token === "offline-token") {
    renderizarVendasLista(tbody);
    return;
  }

  // Modo Online: busca os itens de venda na API
  // A API retorna "itensvenda" que contém o produto e a referência à venda com o cliente
  try {
    const response = await fetch(`${API_BASE_URL}/itensvenda`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Sessão expirada ou token inválido.");
      }
      throw new Error(`Erro na API: Status ${response.status}`);
    }

    const data = await response.json();
    // Normaliza os dados aninhados da API (venda → cliente, produto) para um formato plano
    vendas = data.map((item) => ({
      id: item.venda ? item.venda.id : null,          // ID da venda principal
      itemId: item.id,                                  // ID do item de venda (usado para editar/excluir)
      cliente:
        item.venda && item.venda.cliente
          ? item.venda.cliente.nome                    // Nome do cliente (nested object)
          : "Desconhecido",
      produto: item.produto ? item.produto.nome : "Desconhecido", // Nome do produto
      quantidade: item.quantidade,
    }));
    renderizarVendasLista(tbody);
  } catch (erro) {
    console.error("Falha ao buscar vendas:", erro);
    tbody.innerHTML = `<tr><td colspan="4" class="empty error">Erro ao carregar os dados: ${erro.message}</td></tr>`;
  }
}

// ──────────────────────────────────────────────
// RENDERIZAR LISTA DE VENDAS (monta o HTML da tabela)
// ──────────────────────────────────────────────

function renderizarVendasLista(tbody) {
  if (!vendas || vendas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Nenhuma venda registrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = vendas
    .map(
      (venda, index) => `
    <tr>
      <td>${venda.cliente}</td>
      <td>${venda.produto}</td>
      <td>${venda.quantidade}</td>
      <td>
        <button class="btn-edit" onclick="editarVenda(${index})">Alterar</button>
        <button class="btn-danger" onclick="removerVenda(${index})">Excluir</button>
      </td>
    </tr>
  `,
    )
    .join("");
}

// ──────────────────────────────────────────────
// REMOVER VENDA
// ──────────────────────────────────────────────

async function removerVenda(index) {
  const token = localStorage.getItem("token");

  // ── Modo Online ──
  if (token && token !== "offline-token") {
    const itemId = vendas[index].itemId; // ID do item de venda (deve ser excluído primeiro)
    const vendaId = vendas[index].id;    // ID da venda principal
    try {
      // Passo 1: exclui o item de venda (a API exige que os itens sejam removidos antes da venda)
      const responseItem = await fetch(`${API_BASE_URL}/itensvenda/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (responseItem.ok) {
        // Passo 2: exclui a venda principal (se existir)
        if (vendaId) {
          await fetch(`${API_BASE_URL}/vendas/${vendaId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
        vendas.splice(index, 1); // Remove a venda do array local após exclusão bem-sucedida
        limparFormularioVenda();
        await renderizarVendas();
        atualizarDashboard();
      } else {
        alert("Erro ao excluir item de venda no servidor.");
      }
    } catch (e) {
      console.error("Erro ao excluir venda na API:", e);
      alert("Erro de conexão ao excluir venda.");
    }
  } else {
    // ── Modo Offline: remove diretamente do array local ──
    vendas.splice(index, 1);
    limparFormularioVenda();
    renderizarVendas();
    atualizarDashboard();
  }
}

// ──────────────────────────────────────────────
// ATUALIZAR DASHBOARD
// ──────────────────────────────────────────────

// Atualiza os contadores exibidos nos cards do dashboard com o total atual de cada entidade
function atualizarDashboard() {
  document.getElementById("total-clientes").textContent = clientes.length;
  document.getElementById("total-produtos").textContent = produtos.length;
  document.getElementById("total-vendas").textContent = vendas.length;
}

/*
Conexão futura com Spring Boot:

GET    `${API_BASE_URL}/clientes`
POST   `${API_BASE_URL}/clientes`
PUT    `${API_BASE_URL}/clientes/{id}`
DELETE `${API_BASE_URL}/clientes/{id}`

GET    `${API_BASE_URL}/produtos`
POST   `${API_BASE_URL}/produtos`
PUT    `${API_BASE_URL}/produtos/{id}`
DELETE `${API_BASE_URL}/produtos/{id}`

GET    `${API_BASE_URL}/vendas`
POST   `${API_BASE_URL}/vendas`
PUT    `${API_BASE_URL}/vendas/{id}`
DELETE `${API_BASE_URL}/vendas/{id}`
*/

// ──────────────────────────────────────────────
// INICIALIZAÇÃO
// Carrega os dados de todas as seções assim que o script é executado.
// No modo online, faz chamadas à API. No modo offline (sem token), exibe mensagem de login.
// ──────────────────────────────────────────────
renderizarClientes();
renderizarProdutos();
renderizarVendas();
atualizarDashboard();
