# Colmeia Digital — Mobile (Android First)

Aplicativo móvel desenvolvido com **React Native + Expo** para o sistema **Colmeia Digital** (Projeto FAPEPI).

O aplicativo oferece uma arquitetura robusta **Offline-First**, permitindo que técnicos e apicultores realizem vistorias, inspeções e registros de manejo no campo, mesmo sem qualquer conexão com a internet, persistindo tudo localmente no SQLite e sincronizando com o backend quando a conectividade for restabelecida.

---

## 🎯 Escopo Funcional (5 Módulos Estruturais)

1. **Apiários**: Cadastro, edição, geolocalização e gestão de apiários com controle de membros e permissões.
2. **Caixas (Colmeias)**: Gerenciamento individual de colmeias por apiário com histórico e status.
3. **Revisões (Inspeção Técnica)**: Registro de parâmetros biológicos (cria, postura, espaço, rainha, força do enxame).
4. **Manejos de Campo**: Registro de intervenções e atividades operacionais (alimentação, troca de cera/rainha, divisão, redução de alvado) com suporte a fotos.
5. **Relatórios e Acompanhamento**: Painéis estatísticos, métricas analíticas de crescimento e atividade operacional em tela.

---

## 🎨 Identidade Visual

- **Paleta Institucional**: Petróleo Digital (`#0E4F55`), Verde Floresta (`#136F63`), Teal Suave (`#0D9488` / `#F0FDFA`).
- **Temas Disponíveis**: `petroleo-digital` (padrão), `verde-floresta`, `obsidian-dark`.

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js >= 18.x
- Expo CLI (`npx expo`)
- Dispositivo Android ou Emulador com Expo Go / Dev Client

### Instalação
```bash
npm install
```

### Inicialização
```bash
npx expo start
```
ou para forçar limpeza de cache:
```bash
npx expo start -c
```

---

## 🗄️ Banco de Dados Local

- **SQLite Database**: `colmeia_digital_offline.db`
- Migrações automáticas estruturadas para suportar apenas as tabelas dos 5 módulos ativos.
