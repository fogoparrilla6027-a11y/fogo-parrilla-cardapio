const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const seed = seedData();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function seedData() {
  return {
    users: [
      {
        id: "admin-001",
        name: "Administrador",
        email: "admin@fogoparrilla.com.br",
        password: "admin123",
        phone: "(37) 99999-0000",
        role: "admin",
        addresses: []
      }
    ],
    categories: [
      { id: 1, name: "Pratos Especiais", slug: "pratos-especiais", icon: "🥩", order: 1 },
      { id: 2, name: "Porções", slug: "porcoes", icon: "🍟", order: 2 },
      { id: 3, name: "Combos", slug: "combos", icon: "🔥", order: 3 },
      { id: 4, name: "Pratos do Dia", slug: "pratos-do-dia", icon: "☀️", order: 4 },
      { id: 5, name: "Bebidas", slug: "bebidas", icon: "🥤", order: 5 }
    ],
    products: [
      { id: 1, categoryId: 1, name: "Picanha na Chapa", description: "Picanha selecionada grelhada na chapa, servida com arroz, farofa e vinagrete", price: 89.90, image: "", available: true, featured: true },
      { id: 2, categoryId: 1, name: "Costela no Bafo", description: "Costela bovina assada lentamente no bafo por 12 horas, acompanha mandioca", price: 79.90, image: "", available: true, featured: true },
      { id: 3, categoryId: 1, name: "Maminha ao Molho Madeira", description: "Maminha grelhada ao molho madeira com legumes salteados e arroz", price: 74.90, image: "", available: true, featured: false },
      { id: 4, categoryId: 1, name: "Filé de Frango à Parrilla", description: "Filé de frango grelhado na parrilla, acompanha arroz, feijão e salada", price: 54.90, image: "", available: true, featured: false },
      { id: 5, categoryId: 2, name: "Porção de Batata Frita", description: "Batata frita crocante servida com ketchup e maionese", price: 34.90, image: "", available: true, featured: false },
      { id: 6, categoryId: 2, name: "Porção de Mandioca Frita", description: "Mandioca frita crocante com tempero especial", price: 32.90, image: "", available: true, featured: false },
      { id: 7, categoryId: 2, name: "Porção de Calabresa", description: "Calabresa acebolada com pimentão e molho especial", price: 38.90, image: "", available: true, featured: false },
      { id: 8, categoryId: 2, name: "Porção de Frango à Passarinho", description: "Frango à passarinho crocante com limão e molho tártaro", price: 42.90, image: "", available: true, featured: false },
      { id: 9, categoryId: 2, name: "Porção de Carne de Sol", description: "Carne de sol frita com cebola roxa e azeite", price: 49.90, image: "", available: true, featured: false },
      { id: 10, categoryId: 2, name: "Porção de Torresmo", description: "Torresmo pururuca crocante com limão", price: 29.90, image: "", available: true, featured: false },
      { id: 11, categoryId: 3, name: "Combo Fogo Leve", description: "Picanha na chapa + batata frita + 2 bebidas (refrigerante lata)", price: 119.90, image: "", available: true, featured: true },
      { id: 12, categoryId: 3, name: "Combo Casal", description: "2 picanhas na chapa + mandioca frita + vinagrete + 2 bebidas", price: 179.90, image: "", available: true, featured: true },
      { id: 13, categoryId: 3, name: "Combo Família", description: "Costela no bafo + picanha na chapa + batata frita + mandioca + 4 bebidas", price: 259.90, image: "", available: true, featured: true },
      { id: 14, categoryId: 3, name: "Combo Executivo", description: "Filé de frango à parrilla + arroz + feijão + salada + bebida", price: 59.90, image: "", available: true, featured: false },
      { id: 15, categoryId: 3, name: "Combo Parrilla Leve", description: "Maminha ao molho madeira + arroz + legumes + 1 bebida", price: 89.90, image: "", available: true, featured: false },
      { id: 16, categoryId: 3, name: "Combo Frango Completo", description: "Filé de frango + batata frita + arroz + salada + 2 bebidas", price: 89.90, image: "", available: true, featured: false },
      { id: 17, categoryId: 3, name: "Combo Picanha Premium", description: "Picanha na chapa + batata frita + mandioca + vinagrete + 2 bebidas", price: 149.90, image: "", available: true, featured: false },
      { id: 18, categoryId: 3, name: "Combo Torresmo & Cerveja", description: "Porção de torresmo + 4 cervejas garrafa", price: 69.90, image: "", available: true, featured: false },
      { id: 19, categoryId: 3, name: "Combo Caldo & Drink", description: "Caldo de feijão + porção de torresmo + 2 drinks", price: 59.90, image: "", available: true, featured: false },
      { id: 20, categoryId: 3, name: "Combo Frango & Batata", description: "Frango à passarinho + batata frita + 2 bebidas", price: 69.90, image: "", available: true, featured: false },
      { id: 21, categoryId: 3, name: "Combo Carne de Sol & Mandioca", description: "Carne de sol + mandioca frita + vinagrete + 2 bebidas", price: 79.90, image: "", available: true, featured: false },
      { id: 22, categoryId: 3, name: "Combo Petisco", description: "Batata frita + calabresa acebolada + 2 bebidas", price: 64.90, image: "", available: true, featured: false },
      { id: 23, categoryId: 3, name: "Combo Amigo", description: "Porção mista (batata, mandioca, calabresa) + 3 cervejas", price: 89.90, image: "", available: true, featured: false },
      { id: 24, categoryId: 3, name: "Combo Executivo Maminha", description: "Maminha grelhada + arroz + feijão + batata frita + bebida", price: 79.90, image: "", available: true, featured: false },
      { id: 25, categoryId: 3, name: "Combo Super Família", description: "2 picanhas + costela no bafo + 2 porções + 6 bebidas + sobremesa", price: 349.90, image: "", available: true, featured: false },
      { id: 26, categoryId: 3, name: "Combo da Casa", description: "Picanha na chapa + calabresa acebolada + mandioca + vinagrete + 2 bebidas", price: 129.90, image: "", available: true, featured: false },
      { id: 27, categoryId: 3, name: "Combo Petisco Premium", description: "Batata frita + frango à passarinho + carne de sol + 4 cervejas", price: 119.90, image: "", available: true, featured: false },
      { id: 28, categoryId: 4, name: "Prato do Dia - Segunda", description: "Filé de frango grelhado + arroz + feijão + batata frita + salada", price: 39.90, image: "", available: true, featured: false },
      { id: 29, categoryId: 4, name: "Prato do Dia - Quarta", description: "Bife à milanesa + arroz + feijão + purê + salada", price: 34.90, image: "", available: true, featured: false },
      { id: 30, categoryId: 4, name: "Prato do Dia - Sexta", description: "Peixe grelhado + arroz + feijão + legumes + salada", price: 42.90, image: "", available: true, featured: false },
      { id: 31, categoryId: 5, name: "Coca-Cola Lata", description: "Coca-Cola lata 350ml", price: 6.00, image: "", available: true, featured: false },
      { id: 32, categoryId: 5, name: "Coca-Cola Zero Lata", description: "Coca-Cola Zero lata 350ml", price: 6.00, image: "", available: true, featured: false },
      { id: 33, categoryId: 5, name: "Guaraná Antarctica Lata", description: "Guaraná Antarctica lata 350ml", price: 5.50, image: "", available: true, featured: false },
      { id: 34, categoryId: 5, name: "Fanta Laranja Lata", description: "Fanta Laranja lata 350ml", price: 5.50, image: "", available: true, featured: false },
      { id: 35, categoryId: 5, name: "Sprite Lata", description: "Sprite lata 350ml", price: 5.50, image: "", available: true, featured: false },
      { id: 36, categoryId: 5, name: "Água Mineral", description: "Água mineral sem gás 500ml", price: 4.00, image: "", available: true, featured: false },
      { id: 37, categoryId: 5, name: "Água Mineral com Gás", description: "Água mineral com gás 500ml", price: 4.50, image: "", available: true, featured: false },
      { id: 38, categoryId: 5, name: "Suco Natural de Laranja", description: "Suco natural de laranja 500ml", price: 10.00, image: "", available: true, featured: false },
      { id: 39, categoryId: 5, name: "Suco Natural de Limão", description: "Suco natural de limão 500ml", price: 10.00, image: "", available: true, featured: false },
      { id: 40, categoryId: 5, name: "Cerveja Brahma Garrafa", description: "Cerveja Brahma garrafa 600ml", price: 12.00, image: "", available: true, featured: false },
      { id: 41, categoryId: 5, name: "Cerveja Skol Garrafa", description: "Cerveja Skol garrafa 600ml", price: 12.00, image: "", available: true, featured: false },
      { id: 42, categoryId: 5, name: "Cerveja Antarctica Garrafa", description: "Cerveja Antarctica garrafa 600ml", price: 12.00, image: "", available: true, featured: false },
      { id: 43, categoryId: 5, name: "Cerveja Heineken Garrafa", description: "Cerveja Heineken garrafa 600ml", price: 16.00, image: "", available: true, featured: false }
    ],
    orders: [],
    pix_transactions: [],
    store: {
      name: "Fogo Parrilla",
      slogan: "O verdadeiro sabor da parrilla",
      description: "Churrascaria especializada em carnes nobres grelhadas na parrilla. Tradição desde 2019 em Itaúna-MG.",
      address: "Av. Jove Soares, 1216 - Centro, Itaúna - MG",
      phone: "(37) 99999-0000",
      whatsapp: "5537999990000",
      instagram: "@fogoparrilla",
      since: 2019,
      pix_key: "59086592000159",
      pix_merchant: "FOGO PARRILLA LTDA",
      pix_city: "Itauna",
      delivery_fee: 5.00,
      min_order: 20.00,
      working_hours: "Seg-Sáb: 11h às 23h | Dom: 11h às 16h"
    }
  };
}

module.exports = { load, save };
