package com.sharonsoftware.talentbridge.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaFallbackController {

    @GetMapping({
            "/login",
            "/student/**",
            "/coach/**",
            "/mentor/**",
            "/external-tutor/**",
            "/external-mentor/**",
            "/recruiter/**",
            "/admin/**",
            "/employer/**"
    })
    public String forwardToFrontend() {
        return "forward:/index.html";
    }
}