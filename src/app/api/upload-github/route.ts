import { NextRequest, NextResponse } from 'next/server';

interface GitHubFileResponse {
  content: {
    sha: string;
    name: string;
    path: string;
    download_url: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    const githubBranch = process.env.GITHUB_BRANCH || 'main';
    const allowedMimes = process.env.ALLOWED_MIME?.split(',') || ['image/png', 'image/jpeg', 'image/webp'];
    const maxFileMB = parseInt(process.env.MAX_FILE_MB || '10');

    if (!githubToken || !githubOwner || !githubRepo) {
      return NextResponse.json(
        { error: 'GitHub configuration not found in environment variables' },
        { status: 500 }
      );
    }

    // อ่านข้อมูลจาก FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // ตรวจสอบประเภทไฟล์
    if (!allowedMimes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed. Allowed types: ${allowedMimes.join(', ')}` },
        { status: 400 }
      );
    }

    // ตรวจสอบขนาดไฟล์
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileMB) {
      return NextResponse.json(
        { error: `File size ${fileSizeMB.toFixed(2)}MB exceeds limit of ${maxFileMB}MB` },
        { status: 400 }
      );
    }

    // สร้างชื่อไฟล์ที่ไม่ซ้ำ
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `${folder}/${fileName}`;

    // แปลงไฟล์เป็น base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Content = buffer.toString('base64');

    // อัปโหลดไฟล์ไป GitHub
    const githubApiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`;
    
    const githubResponse = await fetch(githubApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Upload image: ${fileName}`,
        content: base64Content,
        branch: githubBranch,
      }),
    });

    if (!githubResponse.ok) {
      const errorData = await githubResponse.text();
      console.error('GitHub API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to upload to GitHub', details: errorData },
        { status: githubResponse.status }
      );
    }

    const githubData: GitHubFileResponse = await githubResponse.json();

    // สร้าง raw.githubusercontent.com URL
    const rawUrl = `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/${filePath}`;

    return NextResponse.json({
      success: true,
      data: {
        fileName: fileName,
        filePath: filePath,
        url: rawUrl,
        downloadUrl: githubData.content.download_url,
        sha: githubData.content.sha,
        size: file.size,
        type: file.type,
      },
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}