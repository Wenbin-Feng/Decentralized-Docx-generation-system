import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!URL || !KEY) {
  console.error("❌ 缺少 SUPABASE_URL / SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const sb = createClient(URL, KEY);

async function test() {
  console.log("=== Supabase 连接测试 ===");
  console.log("URL:", URL);

  // 1. 测试 swap_events 表是否存在
  console.log("\n1. 测试 swap_events 表...");
  const { data: swapData, error: swapErr } = await sb
    .from("swap_events")
    .select("*")
    .limit(1);

  if (swapErr) {
    console.error("❌ swap_events 表不存在或查询失败:", swapErr.message);
    console.log("\n⚠️  你需要在 Supabase SQL Editor 中执行初始化脚本：");
    console.log("   文件路径: blockchain/dex/scripts/supabase-init.sql");
    return false;
  }
  console.log("✅ swap_events 表存在，当前行数:", swapData?.length ?? 0, "(limit 1)");

  // 2. 测试 price_ohlc 视图是否存在
  console.log("\n2. 测试 price_ohlc 视图...");
  const { data: ohlcData, error: ohlcErr } = await sb
    .from("price_ohlc")
    .select("*")
    .limit(1);

  if (ohlcErr) {
    console.error("❌ price_ohlc 视图不存在或查询失败:", ohlcErr.message);
    console.log("   需要执行 supabase-init.sql 中的 CREATE VIEW 部分");
    return false;
  }
  console.log("✅ price_ohlc 视图存在，当前行数:", ohlcData?.length ?? 0, "(limit 1)");

  // 3. 测试写入权限（用 service key）
  console.log("\n3. 测试写入权限...");
  const testRow = {
    tx_hash: "0x_test_" + Date.now(),
    block_number: 0,
    timestamp: new Date().toISOString(),
    eth_to_sztu: true,
    amount_in: 0.001,
    amount_out: 1.0,
    price: 1000,
    eth_reserve: 1,
    sztu_reserve: 1000,
  };

  const { error: insertErr } = await sb.from("swap_events").insert(testRow);
  if (insertErr) {
    console.error("❌ 写入失败:", insertErr.message);
    if (insertErr.message.includes("row-level security")) {
      console.log("   RLS 阻止了写入。如果用 anon key，这是正常的。");
      console.log("   监听脚本需要使用 service_role key 才能写入。");
    }
    return false;
  }
  console.log("✅ 写入成功");

  // 清理测试数据
  const { error: delErr } = await sb
    .from("swap_events")
    .delete()
    .eq("tx_hash", testRow.tx_hash);
  if (delErr) {
    console.log("⚠️  清理测试数据失败:", delErr.message);
  } else {
    console.log("✅ 测试数据已清理");
  }

  console.log("\n🎉 所有测试通过！数据库已就绪。");
  return true;
}

test().catch(console.error);
