import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import groth16 from 'snarkjs'
import { readFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getSecretWithFallback } from '@/backend/services/kms'

export const runtime = 'nodejs'

let vkeyPromise: Promise<object> | null = null

function loadVkey(): Promise<object> {
  if (!vkeyPromise) {
    vkeyPromise = readFile(
      path.join(process.cwd(), 'public', 'wasm', 'vkey.json'),
      'utf-8',
    ).then((raw) => JSON.parse(raw))
  }
  return vkeyPromise
}

export async function POST(request: NextRequest) {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let userId: string
  try {
    const secret = await getSecretWithFallback(['JWT_SECRET', 'NEXTAUTH_SECRET'])
    const decoded = jwt.verify(header.slice(7), secret) as any
    userId = decoded.id || decoded.sub || decoded.userId
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const body = await request.json()
  const { nullifier, proof, publicSignals, creatorId } = body

  if (!nullifier || !proof || !publicSignals || !creatorId) {
    return NextResponse.json(
      { error: 'nullifier, proof, publicSignals, and creatorId are required' },
      { status: 400 },
    )
  }

  try {
    const vkey = await loadVkey()
    const validProof = await groth16.verify(vkey, publicSignals, proof)
    if (!validProof) {
      return NextResponse.json(
        { error: 'Invalid proof', code: 'INVALID_PROOF' },
        { status: 400 },
      )
    }
  } catch (err) {
    console.error('[verify-proof] proof verification error:', err)
    return NextResponse.json(
      { error: 'Invalid proof', code: 'INVALID_PROOF' },
      { status: 400 },
    )
  }

  try {
    const existing = await prisma.review.findFirst({
      where: { nullifier },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Nullifier already used', code: 'NULLIFIER_USED' },
        { status: 409 },
      )
    }

    return NextResponse.json({
      ok: true,
      nullifier,
      creatorId,
      userId,
    })
  } catch (err) {
    console.error('[verify-proof] DB error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
