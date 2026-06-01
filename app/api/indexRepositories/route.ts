import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import 'dotenv/config';
import { indexRepository } from '../../../lib/indexRepository';
import Session from '../../../models/session';
import { MongoError } from 'mongodb';
import { dbConnect } from '@/lib/mongodb';
import { normalizeRepoName, validateGitHubRepository } from '@/lib/github';

interface IndexRepositoriesRequest {
  idealRepo: string;
  userRepo: string;
  idealBranch: string;
  userBranch: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: IndexRepositoriesRequest = await req.json();
    const idealRepo = normalizeRepoName(body.idealRepo || '');
    const userRepo = normalizeRepoName(body.userRepo || '');
    const idealBranch = body.idealBranch?.trim();
    const userBranch = body.userBranch?.trim();

    if (!idealRepo || !userRepo || !idealBranch || !userBranch) {
      return NextResponse.json({ error: 'Missing required repository fields' }, { status: 400 });
    }

    await dbConnect();

    
    const existingSession = await Session.findOne({
      idealRepo,
      userRepo,
      idealBranch,
      userBranch,
    });

    if (existingSession) {
      return NextResponse.json({
        message: "Session already exists. Your repositories are ready to go.",
        sessionId: existingSession._id,
        status: existingSession.status,
      });
    }

    const session = new Session({
      idealRepo,
      userRepo,
      idealBranch,
      userBranch,
      status: 'validating',
      statusMessage: 'Validating repositories and branches',
    });
    await session.save();

    let sourceRepository;
    let targetRepository;

    try {
      [sourceRepository, targetRepository] = await Promise.all([
        validateGitHubRepository(idealRepo, idealBranch),
        validateGitHubRepository(userRepo, userBranch),
      ]);
    } catch (validationError) {
      session.status = 'failed';
      session.statusMessage =
        validationError instanceof Error ? validationError.message : 'Repository validation failed';
      session.updatedAt = new Date();
      await session.save();

      return NextResponse.json(
        { error: session.statusMessage, sessionId: session._id },
        { status: 400 }
      );
    }

    session.sourceRepository = sourceRepository;
    session.targetRepository = targetRepository;
    session.status = 'indexing';
    session.statusMessage = 'Indexing repositories with Greptile';
    session.updatedAt = new Date();
    await session.save();

    const indexingPromises = [
      indexRepository(idealRepo, idealBranch),
      indexRepository(userRepo, userBranch),
    ];

    try {
      await Promise.all(indexingPromises);
    } catch (indexingError) {
      console.error('Error during repository indexing:', indexingError);
      session.status = 'failed';
      session.statusMessage = 'Failed to index repositories';
      session.updatedAt = new Date();
      await session.save();
      return NextResponse.json(
        { error: 'Failed to index repositories', sessionId: session._id },
        { status: 500 }
      );
    }

    session.status = 'ready';
    session.statusMessage = 'Repositories are ready for feature analysis';
    session.updatedAt = new Date();
    await session.save();

    return NextResponse.json({
      message: "Your repositories are ready to go",
      sessionId: session._id,
      status: session.status,
    });

  } catch (error) {
    console.error('Error in indexing repositories:', error);

    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.message || error.message;
      return NextResponse.json({ error: `API error: ${errorMessage}` }, { status: statusCode });
    }

    if (error instanceof MongoError) {
      console.error('MongoDB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
