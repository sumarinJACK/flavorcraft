import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    // ตรวจสอบ environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    const githubBranch = process.env.GITHUB_BRANCH || 'main';

    if (!githubToken || !githubOwner || !githubRepo) {
      return NextResponse.json(
        { error: 'GitHub configuration not found in environment variables' },
        { status: 500 }
      );
    }

    // อ่านข้อมูลจาก request body
    const { filePath, sha } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // ถ้าไม่มี sha ให้ดึงจาก GitHub ก่อน
    let fileSha = sha;
    if (!fileSha) {
      const getFileUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`;
      const getFileResponse = await fetch(getFileUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!getFileResponse.ok) {
        if (getFileResponse.status === 404) {
          return NextResponse.json(
            { success: true, message: 'File already deleted or not found' },
            { status: 200 }
          );
        }
        
        const errorData = await getFileResponse.text();
        console.error('GitHub API Error (get file):', errorData);
        return NextResponse.json(
          { error: 'Failed to get file info from GitHub', details: errorData },
          { status: getFileResponse.status }
        );
      }

      const fileData = await getFileResponse.json();
      fileSha = fileData.sha;
    }

    // ลบไฟล์จาก GitHub
    const githubApiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`;
    
    const githubResponse = await fetch(githubApiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Delete image: ${filePath.split('/').pop()}`,
        sha: fileSha,
        branch: githubBranch,
      }),
    });

    if (!githubResponse.ok) {
      if (githubResponse.status === 404) {
        return NextResponse.json(
          { success: true, message: 'File already deleted or not found' },
          { status: 200 }
        );
      }

      const errorData = await githubResponse.text();
      console.error('GitHub API Error (delete):', errorData);
      return NextResponse.json(
        { error: 'Failed to delete from GitHub', details: errorData },
        { status: githubResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}