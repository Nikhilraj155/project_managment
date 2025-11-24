import os
import requests
from typing import Optional
from fastapi import HTTPException
from app.config.database import db
from datetime import datetime

def get_brevo_api_key() -> str:
    """Get Brevo API key from environment variables."""
    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Brevo API key not configured")
    return api_key

def get_sender_info():
    """Get sender information for emails."""
    return {
        "name": "Nikhil Raj",
        "email": "nikhilrajjatav@gmail.com"
    }

async def send_team_invitation_email(team_id: str, team_name: str, invitee_email: str, inviter_name: str) -> bool:
    """
    Send a team invitation email using Brevo API.

    Args:
        team_id: The ID of the team
        team_name: Name of the team
        invitee_email: Email address of the person being invited
        inviter_name: Name of the person sending the invitation

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        api_key = get_brevo_api_key()

        # Use deployed frontend URL or fallback to localhost
        frontend_url = os.getenv('FRONTEND_URL', 'https://project-managment-mj1a.onrender.com')

        # Check if user with this email already exists
        existing_user = await db.users.find_one({"email": invitee_email})
        if existing_user:
            # User already exists, provide login link
            login_message = f"""
            <p>A user with this email address already has an account.</p>
            <p><strong>Login:</strong> <a href="{frontend_url}/login">Login to your account</a></p>
            """
        else:
            # User doesn't exist, provide registration link
            login_message = f"""
            <p>No account found with this email address.</p>
            <p><strong>Register:</strong> <a href="{frontend_url}/register">Create a new account</a></p>
            """

        # Email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Team Invitation</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: #4F46E5;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px 8px 0 0;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 8px 8px;
                }}
                .button {{
                    display: inline-block;
                    background: #4F46E5;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Team Invitation</h1>
            </div>
            <div class="content">
                <h2>You're Invited to Join a Team!</h2>

                <p>Hi there,</p>

                <p><strong>{inviter_name}</strong> has invited you to join their team <strong>"{team_name}"</strong> on the Project Management System.</p>

                <p><strong>Team Details:</strong></p>
                <ul>
                    <li><strong>Team Name:</strong> {team_name}</li>
                    <li><strong>Team ID:</strong> {team_id}</li>
                    <li><strong>Invited by:</strong> {inviter_name}</li>
                </ul>

                {login_message}

                <p><strong>What happens next?</strong></p>
                <ul>
                    <li>Once you have an account and log in, you can accept the team invitation</li>
                    <li>Your team will be able to collaborate on projects together</li>
                    <li>You'll have access to team tasks, files, and communication tools</li>
                </ul>

                <p>If you have any questions about this invitation, please contact your team member directly.</p>

                <div class="footer">
                    <p>This email was sent by the Project Management System.</p>
                    <p>If you received this email by mistake, please ignore it.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Brevo API payload
        payload = {
            "sender": get_sender_info(),
            "to": [{"email": invitee_email}],
            "subject": f"You're Invited to Join Team '{team_name}'",
            "htmlContent": html_content,
            "type": "classic"
        }

        # Make API call to Brevo
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": api_key
        }

        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers=headers
        )

        if response.status_code == 201:
            # Store invitation record in database
            invitation_data = {
                "team_id": team_id,
                "invitee_email": invitee_email,
                "inviter_name": inviter_name,
                "team_name": team_name,
                "sent_at": datetime.utcnow(),
                "status": "sent"
            }
            await db.team_invitations.insert_one(invitation_data)
            return True
        else:
            print(f"Brevo API error: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"Error sending invitation email: {str(e)}")
        return False

async def check_user_exists(email: str) -> Optional[dict]:
    """
    Check if a user exists in the database by email.

    Args:
        email: Email address to check

    Returns:
        dict: User document if found, None otherwise
    """
    return await db.users.find_one({"email": email})