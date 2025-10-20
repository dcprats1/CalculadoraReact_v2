#!/usr/bin/env node

const readline = require('readline');

const PRODUCTS_CONFIG = [
  {
    tier: 1,
    name: 'Calculadora Tarifas - 1 Licencia',
    description: '1 dispositivo simultáneo',
    price: 2900,
    devices: 1,
  },
  {
    tier: 2,
    name: 'Calculadora Tarifas - 3 Licencias',
    description: '3 dispositivos simultáneos',
    price: 5900,
    devices: 3,
  },
  {
    tier: 3,
    name: 'Calculadora Tarifas - 5 Licencias',
    description: '5 dispositivos simultáneos',
    price: 8900,
    devices: 5,
  },
  {
    tier: 4,
    name: 'Calculadora Tarifas - 8 Licencias',
    description: '8 dispositivos simultáneos',
    price: 12900,
    devices: 8,
  },
  {
    tier: 5,
    name: 'Calculadora Tarifas - 12 Licencias',
    description: '12 dispositivos simultáneos',
    price: 16900,
    devices: 12,
  },
];

async function createStripeProducts(apiKey) {
  console.log('\n🔄 Creando productos en Stripe...\n');

  const results = [];

  for (const config of PRODUCTS_CONFIG) {
    try {
      // Crear producto
      const productResponse = await fetch('https://api.stripe.com/v1/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          name: config.name,
          description: config.description,
          metadata_tier: config.tier.toString(),
          metadata_devices: config.devices.toString(),
        }).toString(),
      });

      if (!productResponse.ok) {
        const error = await productResponse.text();
        console.error(`❌ Error creando producto Tier ${config.tier}:`, error);
        continue;
      }

      const product = await productResponse.json();
      console.log(`✅ Producto creado: ${config.name} (${product.id})`);

      // Crear precio recurrente mensual
      const priceResponse = await fetch('https://api.stripe.com/v1/prices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          product: product.id,
          currency: 'eur',
          unit_amount: config.price.toString(),
          'recurring[interval]': 'month',
          'metadata[tier]': config.tier.toString(),
          'metadata[devices]': config.devices.toString(),
        }).toString(),
      });

      if (!priceResponse.ok) {
        const error = await priceResponse.text();
        console.error(`❌ Error creando precio Tier ${config.tier}:`, error);
        continue;
      }

      const price = await priceResponse.json();
      console.log(`✅ Precio creado: €${(config.price / 100).toFixed(2)}/mes (${price.id})\n`);

      results.push({
        tier: config.tier,
        productId: product.id,
        priceId: price.id,
        amount: config.price,
        devices: config.devices,
      });
    } catch (error) {
      console.error(`❌ Error en Tier ${config.tier}:`, error.message);
    }
  }

  return results;
}

async function main() {
  console.log('═════════════════════════════════════════════════');
  console.log('   🚀 STRIPE - Configuración Automática');
  console.log('═════════════════════════════════════════════════\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    console.log('📋 Este script creará 5 productos en Stripe:\n');
    PRODUCTS_CONFIG.forEach((p) => {
      console.log(`   Tier ${p.tier}: €${(p.price / 100).toFixed(2)}/mes - ${p.devices} dispositivos`);
    });

    console.log('\n⚠️  IMPORTANTE: Usa tu SECRET KEY de TEST o PRODUCCIÓN\n');

    const apiKey = await question('🔑 Pega tu Stripe Secret Key (sk_test_... o sk_live_...): ');

    if (!apiKey || !apiKey.startsWith('sk_')) {
      console.error('\n❌ API Key inválida. Debe empezar con "sk_test_" o "sk_live_"');
      rl.close();
      process.exit(1);
    }

    const confirm = await question('\n¿Continuar? (escribe "SI"): ');

    if (confirm.toUpperCase() !== 'SI') {
      console.log('\n❌ Cancelado por el usuario');
      rl.close();
      process.exit(0);
    }

    const results = await createStripeProducts(apiKey);

    if (results.length === 0) {
      console.log('\n❌ No se pudo crear ningún producto');
      rl.close();
      process.exit(1);
    }

    console.log('\n═════════════════════════════════════════════════');
    console.log('   ✅ PRODUCTOS CREADOS EXITOSAMENTE');
    console.log('═════════════════════════════════════════════════\n');

    console.log('📋 PRICE IDs para tu frontend:\n');
    console.log('```javascript');
    console.log('const STRIPE_PRICES = {');
    results.forEach((r) => {
      console.log(`  tier${r.tier}: '${r.priceId}', // €${(r.amount / 100).toFixed(2)}/mes - ${r.devices} dispositivos`);
    });
    console.log('};');
    console.log('```\n');

    console.log('🔗 WEBHOOK ENDPOINT (cópialo en tu Stripe Dashboard):\n');
    console.log('   URL: https://[TU_PROYECTO].supabase.co/functions/v1/stripe-webhook');
    console.log('   Eventos: checkout.session.completed, invoice.payment_succeeded, invoice.payment_failed, customer.subscription.deleted, customer.subscription.updated\n');

    console.log('⚙️  NEXT STEPS:\n');
    console.log('   1. Ve a https://dashboard.stripe.com/webhooks');
    console.log('   2. Añade el endpoint de arriba');
    console.log('   3. Copia el "Signing secret" (whsec_...)');
    console.log('   4. Añádelo a Supabase Edge Functions como STRIPE_WEBHOOK_SECRET\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

main();
