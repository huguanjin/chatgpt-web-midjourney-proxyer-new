#!/usr/bin/env node

/**
 * 管理员密码重置工具
 * 
 * 用法:
 *   node scripts/reset-password.js <新密码>
 *   node scripts/reset-password.js                  # 不带参数则生成随机密码
 *   node scripts/reset-password.js --update admin   # 直接更新数据库中指定用户的密码
 * 
 * 加密算法: scrypt (Node.js crypto 内置)
 * 存储格式: salt:hash
 *   - salt: randomBytes(16) → 32字符 hex
 *   - hash: scryptSync(password, salt, 32) → 64字符 hex
 * 
 * 手动更新 MongoDB:
 *   db.users.updateOne(
 *     { username: "admin" },
 *     { $set: { password: "<此脚本输出的加密密码>" } }
 *   )
 */

const { randomBytes, scryptSync } = require('crypto')
const fs = require('fs')
const path = require('path')

// ===== 密码加密（与 auth.service.ts 完全一致）=====

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')   // 32字符 hex salt
  const hash = scryptSync(password, salt, 32).toString('hex') // 64字符 hex hash
  return `${salt}:${hash}`
}

function verifyPassword(password, storedHash) {
  try {
    const [salt, hash] = storedHash.split(':')
    if (!salt || !hash) return false
    const hashBuffer = Buffer.from(hash, 'hex')
    const derivedKey = scryptSync(password, salt, 32)
    return hashBuffer.length === derivedKey.length &&
      require('crypto').timingSafeEqual(hashBuffer, derivedKey)
  } catch {
    return false
  }
}

// ===== 直接更新数据库 =====

async function updateDatabase(username, hashedPassword, rawPassword) {
  let yaml
  try {
    yaml = require('js-yaml')
  } catch {
    console.error('❌ 需要 js-yaml 依赖，请先运行: pnpm install')
    process.exit(1)
  }

  const configPath = path.join(__dirname, '..', 'mongo_config.yaml')
  if (!fs.existsSync(configPath)) {
    console.error('❌ 未找到 mongo_config.yaml，无法连接数据库')
    console.log('💡 请手动在 MongoDB 中执行:')
    console.log(`   db.users.updateOne({ username: "${username}" }, { $set: { password: "${hashedPassword}" } })`)
    process.exit(1)
  }

  const config = yaml.load(fs.readFileSync(configPath, 'utf-8'))
  const { MongoClient } = require('mongodb')
  const client = new MongoClient(config.mongodb.connection_string)

  try {
    await client.connect()
    const db = client.db(config.mongodb.database_name)
    const result = await db.collection('users').updateOne(
      { username },
      { $set: { password: hashedPassword } },
    )

    if (result.matchedCount === 0) {
      console.error(`❌ 用户 "${username}" 不存在`)
      process.exit(1)
    }

    console.log('========================================')
    console.log(`  ✅ 用户 "${username}" 密码已重置`)
    console.log(`  🔑 新密码: ${rawPassword}`)
    console.log('  ⚠️  请登录后立即修改密码！')
    console.log('========================================')
  } catch (err) {
    console.error(`❌ 数据库更新失败: ${err.message}`)
    process.exit(1)
  } finally {
    await client.close()
  }
}

// ===== 主逻辑 =====

async function main() {
  const args = process.argv.slice(2)

  // 解析 --update 参数
  const updateIdx = args.indexOf('--update')
  let updateUsername = null
  if (updateIdx !== -1) {
    updateUsername = args[updateIdx + 1] || 'admin'
    args.splice(updateIdx, 2)
  }

  // 获取或生成密码
  let rawPassword = args[0]
  if (!rawPassword) {
    rawPassword = randomBytes(6).toString('hex') // 12位随机密码
    console.log(`🎲 未指定密码，已自动生成随机密码`)
  }

  if (rawPassword.length < 6) {
    console.error('❌ 密码长度至少 6 个字符')
    process.exit(1)
  }

  const hashedPassword = hashPassword(rawPassword)

  // 验证加密结果
  const isValid = verifyPassword(rawPassword, hashedPassword)

  if (updateUsername) {
    // 直接更新数据库
    await updateDatabase(updateUsername, hashedPassword, rawPassword)
  } else {
    // 仅输出加密结果
    console.log('========================================')
    console.log('  🔐 密码加密工具')
    console.log('========================================')
    console.log()
    console.log(`  明文密码:   ${rawPassword}`)
    console.log(`  加密结果:   ${hashedPassword}`)
    console.log(`  自校验:     ${isValid ? '✅ 通过' : '❌ 失败'}`)
    console.log()
    console.log('  📋 MongoDB 更新命令:')
    console.log(`  db.users.updateOne(`)
    console.log(`    { username: "admin" },`)
    console.log(`    { $set: { password: "${hashedPassword}" } }`)
    console.log(`  )`)
    console.log()
    console.log('  💡 或直接使用 --update 参数自动更新:')
    console.log(`  node scripts/reset-password.js ${rawPassword} --update admin`)
    console.log('========================================')
  }
}

main().catch(console.error)
