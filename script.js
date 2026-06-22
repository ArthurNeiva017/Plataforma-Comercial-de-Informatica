const API_BASE_URL = "http://localhost:8080/api";

let clientes = [];
let produtos = [];
let vendas = [];

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const formLogin = document.getElementById("form-login");
const formRegistro = document.getElementById("form-registro");
const loginErro = document.getElementById("login-erro");
const loginCardTitle = document.getElementById("login-card-title");
const loginCardDesc = document.getElementById("login-card-desc");
const loginCredentials = document.getElementById("login-credentials");

const linkIrRegistro = document.getElementById("link-ir-registro");
const linkIrLogin = document.getElementById("link-ir-login");

const sections = document.querySelectorAll(".section");
const navButtons = document.querySelectorAll(".nav-btn");
const pageTitle = document.getElementById("page-title");

// Alternar para tela de Registro
linkIrRegistro.addEventListener("click", (event) => {
  event.preventDefault();
  formLogin.classList.add("hidden");
  formRegistro.classList.remove("hidden");
  loginCardTitle.textContent = "Criar Nova Conta";
  loginCardDesc.textContent = "Preencha os campos para se cadastrar";
  loginCredentials.classList.add("hidden");
  loginErro.textContent = "";
});

// Alternar para tela de Login
linkIrLogin.addEventListener("click", (event) => {
  event.preventDefault();
  formRegistro.classList.add("hidden");
  formLogin.classList.remove("hidden");
  loginCardTitle.textContent = "Sistema de Gestão Comercial";
  loginCardDesc.textContent = "Acesse o painel administrativo";
  loginCredentials.classList.remove("hidden");
  loginErro.textContent = "";
});

// Evento de Submissão do Registro
formRegistro.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nome = document.getElementById("registro-nome").value;
  const email = document.getElementById("registro-usuario").value;
  const password = document.getElementById("registro-senha").value;

  try {
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

    if (response.status === 201 || response.status === 200) {
      alert("Usuário cadastrado com sucesso! Agora você pode fazer login.");
      formRegistro.reset();
      formRegistro.classList.add("hidden");
      formLogin.classList.remove("hidden");
      loginCardTitle.textContent = "Sistema de Gestão Comercial";
      loginCardDesc.textContent = "Acesse o painel administrativo";
      loginCredentials.classList.remove("hidden");
      loginErro.textContent = "";
    } else if (response.status === 409) {
      loginErro.textContent = "Erro: Este e-mail já está cadastrado.";
    } else {
      loginErro.textContent = "Erro ao registrar usuário. Tente novamente.";
    }
  } catch (e) {
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

formLogin.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("login-usuario").value;
  const password = document.getElementById("login-senha").value;

  try {
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
      const token = data.token;

      localStorage.setItem("token", token);

      loginErro.textContent = "";
      loginScreen.classList.add("hidden");
      appScreen.classList.remove("hidden");
      
      // Carrega os dados do painel imediatamente após o login
      renderizarClientes();
      renderizarProdutos();
      renderizarVendas();
      atualizarDashboard();
      return;
    } else if (response.status === 401) {
      loginErro.textContent = "Usuário ou senha inválidos.";
      return;
    } else {
      loginErro.textContent = "Erro ao tentar realizar login no servidor.";
      return;
    }
  } catch (e) {
    console.error(
      "Erro de conexão com o servidor. Usando fallback offline...",
      e,
    );
  }

  // Fallback offline caso o servidor Spring Boot esteja desligado
  if (email === "admin" && password === "1234") {
    localStorage.setItem("token", "offline-token");
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

document.getElementById("btn-sair").addEventListener("click", () => {
  localStorage.removeItem("token");
  appScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  formLogin.reset();
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const sectionName = button.dataset.section;

    navButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    sections.forEach((section) => section.classList.remove("active"));
    document.getElementById(sectionName).classList.add("active");

    pageTitle.textContent = button.textContent;
  });
});

document
  .getElementById("form-cliente")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const index = document.getElementById("cliente-index").value;
    const cliente = {
      nome: document.getElementById("cliente-nome").value,
      email: document.getElementById("cliente-email").value,
      telefone: document.getElementById("cliente-telefone").value,
      endereco: document.getElementById("cliente-endereco").value,
      cpf: document.getElementById("cliente-cpf").value,
    };

    const token = localStorage.getItem("token");

    if (token && token !== "offline-token") {
      try {
        let response;
        if (index === "") {
          response = await fetch(`${API_BASE_URL}/clientes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(cliente),
          });
        } else {
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
          limparFormularioCliente();
          await renderizarClientes();
          atualizarDashboard();
        } else {
          alert("Erro ao salvar cliente no servidor.");
        }
      } catch (e) {
        console.error("Erro ao salvar cliente na API:", e);
        alert("Erro de conexão ao salvar cliente.");
      }
    } else {
      if (index === "") {
        clientes.push(cliente);
      } else {
        if (clientes[index] && clientes[index].id) {
          cliente.id = clientes[index].id;
        }
        clientes[index] = cliente;
      }

      limparFormularioCliente();
      renderizarClientes();
      atualizarDashboard();
    }
  });

document
  .getElementById("cancelar-cliente")
  .addEventListener("click", limparFormularioCliente);

function editarCliente(index) {
  const cliente = clientes[index];

  document.getElementById("cliente-index").value = index;
  document.getElementById("cliente-nome").value = cliente.nome;
  document.getElementById("cliente-email").value = cliente.email;
  document.getElementById("cliente-telefone").value = cliente.telefone;
  document.getElementById("cliente-cpf").value = cliente.cpf;
  document.getElementById("cliente-endereco").value = cliente.endereco;

  document.getElementById("titulo-form-cliente").textContent =
    "Alterar Cliente";
  document.getElementById("btn-cliente").textContent = "Salvar Alterações";
  document.getElementById("cancelar-cliente").classList.remove("hidden");
}

function limparFormularioCliente() {
  document.getElementById("form-cliente").reset();
  document.getElementById("cliente-index").value = "";
  document.getElementById("titulo-form-cliente").textContent =
    "Cadastrar Cliente";
  document.getElementById("btn-cliente").textContent = "Salvar Cliente";
  document.getElementById("cancelar-cliente").classList.add("hidden");
}

async function renderizarClientes() {
  const tbody = document.getElementById("lista-clientes");
  const token = localStorage.getItem("token");

  if (!token) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Usuário não autenticado. Faça login.</td></tr>`;
    return;
  }

  // Modo Offline (Fallback)
  if (token === "offline-token") {
    renderizarClientesLista(tbody);
    return;
  }

  // Modo Online
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
    renderizarClientesLista(tbody);
  } catch (erro) {
    console.error("Falha ao buscar clientes:", erro);
    tbody.innerHTML = `<tr><td colspan="4" class="empty error">Erro ao carregar os dados: ${erro.message}</td></tr>`;
  }
}

function renderizarClientesLista(tbody) {
  if (!clientes || clientes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Nenhum cliente cadastrado.</td></tr>`;
    return;
  }

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

async function removerCliente(index) {
  const token = localStorage.getItem("token");

  if (token && token !== "offline-token") {
    const id = clientes[index].id;
    try {
      const response = await fetch(`${API_BASE_URL}/clientes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        limparFormularioCliente();
        await renderizarClientes();
        atualizarDashboard();
      } else {
        alert("Erro ao excluir cliente no servidor.");
      }
    } catch (e) {
      console.error("Erro ao excluir cliente na API:", e);
      alert("Erro de conexão ao excluir cliente.");
    }
  } else {
    limparFormularioCliente();
    renderizarClientes();
    atualizarDashboard();
  }
}

// PRODUTOS
document
  .getElementById("form-produto")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const index = document.getElementById("produto-index").value;
    const produto = {
      nome: document.getElementById("produto-nome").value,
      preco: Number(document.getElementById("produto-preco").value),
      estoque: Number(document.getElementById("produto-estoque").value),
    };

    const token = localStorage.getItem("token");

    if (token && token !== "offline-token") {
      const produtoDetails = {
        nome: produto.nome,
        preco: produto.preco,
        quantidade: produto.estoque,
      };

      try {
        let response;
        if (index === "") {
          response = await fetch(`${API_BASE_URL}/produtos`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(produtoDetails),
          });
        } else {
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
          await renderizarProdutos();
          atualizarDashboard();
        } else {
          alert("Erro ao salvar produto no servidor.");
        }
      } catch (e) {
        console.error("Erro ao salvar produto na API:", e);
        alert("Erro de conexão ao salvar produto.");
      }
    } else {
      if (index === "") {
        produtos.push(produto);
      } else {
        if (produtos[index] && produtos[index].id) {
          produto.id = produtos[index].id;
        }
        produtos[index] = produto;
      }

      limparFormularioProduto();
      renderizarProdutos();
      atualizarDashboard();
    }
  });

document
  .getElementById("cancelar-produto")
  .addEventListener("click", limparFormularioProduto);

function editarProduto(index) {
  const produto = produtos[index];

  document.getElementById("produto-index").value = index;
  document.getElementById("produto-nome").value = produto.nome;
  document.getElementById("produto-preco").value = produto.preco;
  document.getElementById("produto-estoque").value = produto.estoque;

  document.getElementById("titulo-form-produto").textContent =
    "Alterar Produto";
  document.getElementById("btn-produto").textContent = "Salvar Alterações";
  document.getElementById("cancelar-produto").classList.remove("hidden");
}

function limparFormularioProduto() {
  document.getElementById("form-produto").reset();
  document.getElementById("produto-index").value = "";
  document.getElementById("titulo-form-produto").textContent =
    "Cadastrar Produto";
  document.getElementById("btn-produto").textContent = "Salvar Produto";
  document.getElementById("cancelar-produto").classList.add("hidden");
}

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
    produtos = data.map((p) => ({
      id: p.id,
      nome: p.nome,
      preco: p.preco,
      estoque: p.quantidade,
    }));
    renderizarProdutosLista(tbody);
  } catch (erro) {
    console.error("Falha ao buscar produtos:", erro);
    tbody.innerHTML = `<tr><td colspan="4" class="empty error">Erro ao carregar os dados: ${erro.message}</td></tr>`;
  }
}

function renderizarProdutosLista(tbody) {
  if (!produtos || produtos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Nenhum produto cadastrado.</td></tr>`;
    return;
  }

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

async function removerProduto(index) {
  const token = localStorage.getItem("token");

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
        produtos.splice(index, 1);
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
    produtos.splice(index, 1);
    limparFormularioProduto();
    renderizarProdutos();
    atualizarDashboard();
  }
}

// VENDAS
document
  .getElementById("form-venda")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const index = document.getElementById("venda-index").value;
    const venda = {
      cliente: document.getElementById("venda-cliente").value,
      produto: document.getElementById("venda-produto").value,
      quantidade: Number(document.getElementById("venda-quantidade").value),
    };

    const token = localStorage.getItem("token");

    if (token && token !== "offline-token") {
      // Encontra o cliente e o produto nas listas locais
      const clienteObj = clientes.find(
        (c) => c.nome.toLowerCase() === venda.cliente.toLowerCase(),
      );
      const produtoObj = produtos.find(
        (p) => p.nome.toLowerCase() === venda.produto.toLowerCase(),
      );

      if (!clienteObj) {
        alert(
          "Cliente não encontrado no sistema. Cadastre-o na área de clientes.",
        );
        return;
      }
      if (!produtoObj) {
        alert(
          "Produto não encontrado no sistema. Cadastre-o na área de produtos.",
        );
        return;
      }

      const valorTotal = produtoObj.preco * venda.quantidade;
      const dataVenda = new Date().toISOString().split("T")[0];

      try {
        let responseVenda;
        if (index === "") {
          // Criar venda
          responseVenda = await fetch(`${API_BASE_URL}/vendas`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              data: dataVenda,
              valorTotal: valorTotal,
              cliente: { id: clienteObj.id },
              usuario: { id: 1 }, // Usuário administrador padrão
            }),
          });

          if (responseVenda.ok) {
            const savedVenda = await responseVenda.json();

            // Criar item venda relacionado
            const responseItem = await fetch(`${API_BASE_URL}/itensvenda`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                venda: { id: savedVenda.id },
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
          const idVenda = vendas[index].id;
          const idItem = vendas[index].itemId;

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
                  venda: { id: idVenda },
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
      if (index === "") {
        vendas.push(venda);
      } else {
        if (vendas[index]) {
          venda.id = vendas[index].id;
          venda.itemId = vendas[index].itemId;
        }
        vendas[index] = venda;
      }

      limparFormularioVenda();
      renderizarVendas();
      atualizarDashboard();
    }
  });

document
  .getElementById("cancelar-venda")
  .addEventListener("click", limparFormularioVenda);

function editarVenda(index) {
  const venda = vendas[index];

  document.getElementById("venda-index").value = index;
  document.getElementById("venda-cliente").value = venda.cliente;
  document.getElementById("venda-produto").value = venda.produto;
  document.getElementById("venda-quantidade").value = venda.quantidade;

  document.getElementById("titulo-form-venda").textContent = "Alterar Venda";
  document.getElementById("btn-venda").textContent = "Salvar Alterações";
  document.getElementById("cancelar-venda").classList.remove("hidden");
}

function limparFormularioVenda() {
  document.getElementById("form-venda").reset();
  document.getElementById("venda-index").value = "";
  document.getElementById("titulo-form-venda").textContent = "Registrar Venda";
  document.getElementById("btn-venda").textContent = "Registrar Venda";
  document.getElementById("cancelar-venda").classList.add("hidden");
}

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

  // Modo Online
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
    vendas = data.map((item) => ({
      id: item.venda ? item.venda.id : null,
      itemId: item.id,
      cliente:
        item.venda && item.venda.cliente
          ? item.venda.cliente.nome
          : "Desconhecido",
      produto: item.produto ? item.produto.nome : "Desconhecido",
      quantidade: item.quantidade,
    }));
    renderizarVendasLista(tbody);
  } catch (erro) {
    console.error("Falha ao buscar vendas:", erro);
    tbody.innerHTML = `<tr><td colspan="4" class="empty error">Erro ao carregar os dados: ${erro.message}</td></tr>`;
  }
}

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

async function removerVenda(index) {
  const token = localStorage.getItem("token");

  if (token && token !== "offline-token") {
    const itemId = vendas[index].itemId;
    const vendaId = vendas[index].id;
    try {
      const responseItem = await fetch(`${API_BASE_URL}/itensvenda/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (responseItem.ok) {
        if (vendaId) {
          await fetch(`${API_BASE_URL}/vendas/${vendaId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
        vendas.splice(index, 1);
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
    vendas.splice(index, 1);
    limparFormularioVenda();
    renderizarVendas();
    atualizarDashboard();
  }
}

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

renderizarClientes();
renderizarProdutos();
renderizarVendas();
atualizarDashboard();
