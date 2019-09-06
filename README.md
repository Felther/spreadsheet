# Desafio Tunts
Este repositório contém a resposta que desenvolvi para o desafio Tunts. Utilizei o Node.js **v10.16.3** e a API do Google **v39.2.0** para manipular as planilhas do Google Sheets.
As funções de conexão e autorização foram retiradas do [Quickstart](https://developers.google.com/sheets/api/quickstart/nodejs) fornecido pelo Google Developers, as consultas à API foram feitas com base na documetação e adaptadas conforme a necessidade.

## Observações
* Deixei alguns comentários TODO de elementos que gostaria de fazer antes de entregar o desafio na segunda;
* Com exceção deste Leia-me e do gitignore, somente o index.js e o package.json estão no repositório;
* Fiz uma cópia da planilha fornecida no e-mail no meu drive e utilizei [ela](https://docs.google.com/spreadsheets/d/1_doGr26mw141Ay-U5MQZSZbqH7mmHPrrxa1eiq9eZLU/edit#gid=0) para testes;
* Tentei não alterar muito as funções que já vieram com o Quickstart;
* Acredito que sejam ainda sejam necessárias algumas validações em certas variáveis;
* A aplicação vai pedir para autorizar a edição de planilhas no drive, como é um scope sensível, ele vai exibir uma tela de aviso antes;

## Dúvidas
* Tenho dúvidas sobre o cálculo da nota final de aprovação, entendi ele como: a média entre a nota final de aprovação e a média final deve ser **maior ou igual** a 50. Está correto?